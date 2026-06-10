from fastapi import APIRouter, HTTPException, Depends, Response
from app.config import supabase, HMAC_SECRET
from app.dependencies import require_admin
from app.models.schemas import PrintQRRequest
from datetime import datetime, timezone, date
import hmac
import hashlib
import qrcode
import io
import calendar

router = APIRouter(prefix="/qr", tags=["QR"])


def get_month_end() -> date:
    today = date.today()
    last_day = calendar.monthrange(today.year, today.month)[1]
    return date(today.year, today.month, last_day)


def generate_qr_token(user_id: str, valid_until: str) -> str:
    payload = f"user_id:{user_id}|valid_until:{valid_until}"
    signature = hmac.new(
        HMAC_SECRET.encode(), payload.encode(), hashlib.sha256
    ).hexdigest()
    return f"{payload}|sig:{signature}"


def generate_qr_image(token: str) -> bytes:
    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_M,
        box_size=10,
        border=4,
    )
    qr.add_data(token)
    qr.make(fit=True)
    img = qr.make_image(fill_color="black", back_color="white")
    buffer = io.BytesIO()
    img.save(buffer, format="PNG")
    return buffer.getvalue()


@router.post("/generate/{user_id}")
def generate_qr(user_id: str, current_user: dict = Depends(require_admin)):
    # Check user exists and is active
    user = supabase.table("users").select(
        "*, projects(project_number), lines(line_type)"
    ).eq("id", user_id).single().execute()

    if not user.data:
        raise HTTPException(status_code=404, detail="User not found")
    if user.data["status"] != "active":
        raise HTTPException(status_code=400, detail="User is not active")

    valid_until = get_month_end().isoformat()
    token = generate_qr_token(user_id, valid_until)
    token_hash = hashlib.sha256(token.encode()).hexdigest()

    # Deactivate old QR tokens
    supabase.table("qr_tokens").update({"is_active": False}).eq("user_id", user_id).execute()

    # Create new QR token
    supabase.table("qr_tokens").insert({
        "user_id": user_id,
        "token_hash": token_hash,
        "is_active": True,
        "valid_from": date.today().isoformat(),
        "valid_until": valid_until,
        "printed_at": datetime.now(timezone.utc).isoformat()
    }).execute()

    # Generate QR image
    img_bytes = generate_qr_image(token)

    return Response(
        content=img_bytes,
        media_type="image/png",
        headers={"X-Valid-Until": valid_until}
    )


@router.post("/reprint/{user_id}")
def reprint_qr(user_id: str, current_user: dict = Depends(require_admin)):
    # Get existing active QR
    existing = supabase.table("qr_tokens").select("*").eq(
        "user_id", user_id
    ).eq("is_active", True).execute()

    if not existing.data:
        raise HTTPException(status_code=404, detail="No active QR found — generate one first")

    qr_record = existing.data[0]
    valid_until = qr_record["valid_until"]

    # Check not expired
    if date.fromisoformat(valid_until) < date.today():
        raise HTTPException(status_code=400, detail="QR has expired — generate a new one")

    # Update reprint timestamp
    supabase.table("qr_tokens").update({
        "reprinted_at": datetime.now(timezone.utc).isoformat()
    }).eq("id", qr_record["id"]).execute()

    # Regenerate same token
    token = generate_qr_token(user_id, valid_until)
    img_bytes = generate_qr_image(token)

    return Response(
        content=img_bytes,
        media_type="image/png",
        headers={"X-Valid-Until": valid_until}
    )


@router.post("/print-batch")
def print_batch(body: PrintQRRequest, current_user: dict = Depends(require_admin)):
    results = []
    valid_until = get_month_end().isoformat()

    for user_id in body.user_ids:
        user = supabase.table("users").select("*").eq("id", user_id).single().execute()
        if not user.data or user.data["status"] != "active":
            continue

        token = generate_qr_token(user_id, valid_until)
        token_hash = hashlib.sha256(token.encode()).hexdigest()

        # Deactivate old
        supabase.table("qr_tokens").update({"is_active": False}).eq("user_id", user_id).execute()

        # Create new
        supabase.table("qr_tokens").insert({
            "user_id": user_id,
            "token_hash": token_hash,
            "is_active": True,
            "valid_from": date.today().isoformat(),
            "valid_until": valid_until,
            "printed_at": datetime.now(timezone.utc).isoformat()
        }).execute()

        results.append({
            "user_id": user_id,
            "employee_id": user.data["employee_id"],
            "full_name": user.data["full_name"],
            "token": token,
            "valid_until": valid_until
        })

    return {"message": f"Generated {len(results)} QR codes", "data": results}


@router.get("/expire-check")
def expire_old_qrs(current_user: dict = Depends(require_admin)):
    today = date.today().isoformat()
    result = supabase.table("qr_tokens").update({"is_active": False}).lt(
        "valid_until", today
    ).eq("is_active", True).execute()
    return {"message": f"Expired QR tokens updated"}