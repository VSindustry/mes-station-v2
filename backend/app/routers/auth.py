from fastapi import APIRouter, HTTPException, Depends
from app.config import supabase, JWT_SECRET, JWT_EXPIRE_HOURS, HMAC_SECRET
from app.dependencies import require_admin
from app.models.schemas import PINLoginRequest, QRLoginRequest
from passlib.context import CryptContext
from jose import jwt
from datetime import datetime, timezone, timedelta, date
import hmac, hashlib

router = APIRouter(prefix="/auth", tags=["Auth"])
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def create_token(user: dict) -> str:
    expire = datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRE_HOURS)
    payload = {
        "sub": user["id"],
        "employee_id": user["employee_id"],
        "full_name": user["full_name"],
        "role": user["role"],
        "project_id": user.get("project_id"),
        "line_id": user.get("line_id"),
        "shift": user.get("shift"),
        "exp": expire,
    }
    return jwt.encode(payload, JWT_SECRET, algorithm="HS256")


def log_audit(actor_id: str, action: str, target_user_id: str = None, target_table: str = None, target_id: str = None, old_data: dict = None, new_data: dict = None, note: str = None):
    try:
        supabase.table("audit_log").insert({
            "actor_id": actor_id,
            "action": action,
            "target_user_id": target_user_id,
            "target_table": target_table,
            "target_id": target_id,
            "old_data": old_data,
            "new_data": new_data,
            "note": note,
            "created_at": datetime.now(timezone.utc).isoformat()
        }).execute()
    except: pass


def do_monthly_reset(month_year: str):
    """Wipe all non-admin users and save to history"""
    try:
        print(f"Starting monthly reset for {month_year}...")

        # Get all non-admin users
        users = supabase.table("users").select(
            "id, employee_id, full_name, role, shift, badge_number, created_at, "
            "projects(project_number), lines(line_type)"
        ).neq("role", "mes_admin").in_("status", ["active", "pending"]).execute()

        non_admin_ids = [u["id"] for u in (users.data or [])]

        # Save each user to history
        for u in (users.data or []):
            try:
                project = u.get("projects") or {}
                line = u.get("lines") or {}
                supabase.table("user_history").insert({
                    "employee_id": u.get("employee_id"),
                    "full_name": u.get("full_name"),
                    "role": u.get("role"),
                    "shift": u.get("shift"),
                    "badge_number": u.get("badge_number"),
                    "project_number": project.get("project_number", "N/A"),
                    "line_type": line.get("line_type", "N/A"),
                    "station_code": "-",
                    "month_year": month_year,
                    "registered_at": u.get("created_at"),
                }).execute()
            except: pass

        # Expire all assignments
        try:
            supabase.table("station_assignments").update(
                {"status": "expired"}
            ).in_("status", ["active", "pending"]).execute()
        except: pass

        # Null out foreign keys
        if non_admin_ids:
            try:
                supabase.table("station_assignments").update(
                    {"assigned_by": None}
                ).in_("assigned_by", non_admin_ids).execute()
            except: pass
            try:
                supabase.table("station_assignments").update(
                    {"approved_by": None}
                ).in_("approved_by", non_admin_ids).execute()
            except: pass

        # Delete qr tokens
        try:
            supabase.table("qr_tokens").delete().neq(
                "id", "00000000-0000-0000-0000-000000000000"
            ).execute()
        except: pass

        # Delete audit logs
        if non_admin_ids:
            try:
                supabase.table("audit_log").delete().in_(
                    "actor_id", non_admin_ids
                ).execute()
            except: pass
            try:
                supabase.table("audit_log").delete().in_(
                    "target_user_id", non_admin_ids
                ).execute()
            except: pass

        # Delete auth users first then public users
        # Bulk delete all non-admin auth users in ONE call
        try:
            supabase.rpc('bulk_delete_non_admin_auth_users').execute()
        except Exception as e:
            print(f"Bulk auth delete error: {e}")

        # Delete from public.users
        try:
            supabase.table("users").delete().neq("role", "mes_admin").execute()
        except Exception as e:
            print(f"Delete users error: {e}")

        print(f"Monthly reset complete! All users cleared for {month_year}")

    except Exception as e:
        print(f"Monthly reset error: {e}")


def check_monthly_reset():
    """Check if it's a new month and reset if needed"""
    try:
        current_month = date.today().strftime("%Y-%m-01")

        result = supabase.table("users").select(
            "created_at"
        ).neq("role", "mes_admin").in_(
            "status", ["active", "pending"]
        ).order("created_at").limit(1).execute()

        if not result.data:
            return

        oldest_created = result.data[0]["created_at"][:7]
        current_ym = date.today().strftime("%Y-%m")

        if oldest_created < current_ym:
            print(f"New month detected! {oldest_created} → {current_ym}. Triggering reset...")
            do_monthly_reset(current_month)

    except Exception as e:
        print(f"Monthly check error: {e}")


@router.post("/pin-login")
def pin_login(body: PINLoginRequest):
    user = supabase.table("users").select("*").eq(
        "employee_id", body.employee_id.upper()
    ).single().execute()

    if not user.data:
        raise HTTPException(status_code=401, detail="Invalid Employee ID or PIN")

    u = user.data
    if u["status"] != "active":
        raise HTTPException(status_code=403, detail=f"Account is {u['status']}")

    if not u.get("pin_hash") or not pwd_context.verify(body.pin, u["pin_hash"]):
        raise HTTPException(status_code=401, detail="Invalid Employee ID or PIN")

    # Only admin triggers monthly reset check on login
    if u["role"] == "mes_admin":
        check_monthly_reset()

    supabase.table("users").update({
        "last_login_at": datetime.now(timezone.utc).isoformat()
    }).eq("id", u["id"]).execute()

    try:
        supabase.table("sessions").delete().eq("user_id", u["id"]).execute()
        supabase.table("sessions").insert({"user_id": u["id"]}).execute()
    except: pass

    log_audit(
        actor_id=u["id"],
        action="login",
        target_user_id=u["id"],
        target_table="users",
        target_id=u["id"],
        note=f"{u['full_name']} ({u['employee_id']}) logged in via PIN"
    )

    token = create_token(u)
    return {
        "access_token": token,
        "token_type": "bearer",
        "user_id": u["id"],
        "employee_id": u["employee_id"],
        "full_name": u["full_name"],
        "short_name": u.get("short_name"),
        "role": u["role"],
        "project_id": u.get("project_id"),
        "line_id": u.get("line_id"),
        "shift": u.get("shift"),
        "expires_in": JWT_EXPIRE_HOURS * 3600,
    }


@router.post("/qr-login")
def qr_login(body: QRLoginRequest):
    try:
        parts = body.qr_content.split("|")
        if len(parts) < 3:
            raise ValueError("Invalid QR format")
        user_id = parts[0].split(":")[1]
        valid_until = parts[1].split(":")[1]
        received_sig = parts[2].split(":")[1]

        payload = f"user_id:{user_id}|valid_until:{valid_until}"
        expected_sig = hmac.new(
            HMAC_SECRET.encode(), payload.encode(), hashlib.sha256
        ).hexdigest()

        if not hmac.compare_digest(received_sig, expected_sig):
            raise HTTPException(status_code=401, detail="Invalid QR code")

        expiry = datetime.strptime(valid_until, "%Y-%m-%d").date()
        if expiry < datetime.now(timezone.utc).date():
            raise HTTPException(status_code=401, detail="QR code has expired")

    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid QR code format")

    qr = supabase.table("qr_tokens").select("*").eq(
        "user_id", user_id
    ).eq("is_active", True).execute()

    if not qr.data:
        raise HTTPException(status_code=401, detail="QR code is not active")

    user = supabase.table("users").select("*").eq("id", user_id).single().execute()
    if not user.data or user.data["status"] != "active":
        raise HTTPException(status_code=403, detail="Account is not active")

    u = user.data

    supabase.table("users").update({
        "last_login_at": datetime.now(timezone.utc).isoformat()
    }).eq("id", u["id"]).execute()

    try:
        supabase.table("sessions").delete().eq("user_id", u["id"]).execute()
        supabase.table("sessions").insert({"user_id": u["id"]}).execute()
    except: pass

    log_audit(
        actor_id=u["id"],
        action="login",
        target_user_id=u["id"],
        target_table="users",
        target_id=u["id"],
        note=f"{u['full_name']} ({u['employee_id']}) logged in via QR"
    )

    token = create_token(u)
    return {
        "access_token": token,
        "token_type": "bearer",
        "user_id": u["id"],
        "employee_id": u["employee_id"],
        "full_name": u["full_name"],
        "short_name": u.get("short_name"),
        "role": u["role"],
        "project_id": u.get("project_id"),
        "line_id": u.get("line_id"),
        "shift": u.get("shift"),
        "expires_in": JWT_EXPIRE_HOURS * 3600,
    }


@router.post("/logout")
def logout(credentials: dict = None):
    return {"message": "Logged out successfully"}


@router.post("/manual-reset")
def manual_reset(current_user: dict = Depends(require_admin)):
    month_year = date.today().strftime("%Y-%m-01")
    do_monthly_reset(month_year)
    return {"message": f"Monthly reset completed for {month_year}"}