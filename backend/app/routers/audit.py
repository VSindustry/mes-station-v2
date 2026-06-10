from fastapi import APIRouter, Depends
from app.config import supabase
from app.dependencies import require_admin
from datetime import datetime, timezone, timedelta

router = APIRouter(prefix="/audit", tags=["Audit"])


@router.get("/")
def get_audit_log(
    limit: int = 200,
    current_user: dict = Depends(require_admin)
):
    result = supabase.table("audit_log").select(
        "*, users!audit_log_actor_id_fkey(full_name, employee_id, role)"
    ).order("created_at", desc=True).limit(limit).execute()
    return result.data or []


@router.delete("/")
def delete_audit_logs(range: str = "all", current_user: dict = Depends(require_admin)):
    now = datetime.now(timezone.utc)

    if range == "today":
        start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        supabase.table("audit_log").delete().gte("created_at", start.isoformat()).execute()

    elif range == "yesterday":
        yesterday = now - timedelta(days=1)
        start = yesterday.replace(hour=0, minute=0, second=0, microsecond=0)
        end = yesterday.replace(hour=23, minute=59, second=59, microsecond=999999)
        supabase.table("audit_log").delete().gte("created_at", start.isoformat()).lte("created_at", end.isoformat()).execute()

    elif range == "all":
        supabase.table("audit_log").delete().neq("id", "00000000-0000-0000-0000-000000000000").execute()

    return {"message": f"Audit logs ({range}) deleted successfully"}