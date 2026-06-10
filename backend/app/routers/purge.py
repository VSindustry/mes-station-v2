from fastapi import APIRouter, HTTPException, Depends
from app.config import supabase
from app.dependencies import require_admin
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timezone

router = APIRouter(prefix="/purge", tags=["Purge"])

class PurgeRequest(BaseModel):
    month_year: str
    project_id: Optional[int] = None
    shift: Optional[str] = None
    note: Optional[str] = None

@router.post("/count")
def count_records(body: PurgeRequest, current_user: dict = Depends(require_admin)):
    try:
        query = supabase.table("user_history").select("id", count="exact")
        query = query.eq("month_year", body.month_year)
        if body.shift:
            query = query.eq("shift", body.shift)
        if body.project_id:
            proj = supabase.table("projects").select("project_number").eq(
                "id", body.project_id
            ).single().execute()
            if proj.data:
                query = query.eq("project_number", proj.data["project_number"])
        result = query.execute()
        return {"count": result.count or 0}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/execute")
def execute_purge(body: PurgeRequest, current_user: dict = Depends(require_admin)):
    try:
        if not body.month_year:
            raise HTTPException(status_code=400, detail="Month is required")

        # Build delete query
        query = supabase.table("user_history").delete()
        query = query.eq("month_year", body.month_year)
        if body.shift:
            query = query.eq("shift", body.shift)
        if body.project_id:
            proj = supabase.table("projects").select("project_number").eq(
                "id", body.project_id
            ).single().execute()
            if proj.data:
                query = query.eq("project_number", proj.data["project_number"])

        result = query.execute()

        # Log audit
        try:
            supabase.table("audit_log").insert({
                "actor_id": current_user["sub"],
                "action": "data_purge",
                "target_table": "user_history",
                "note": f"Data purge — month: {body.month_year} | reason: {body.note}",
                "created_at": datetime.now(timezone.utc).isoformat()
            }).execute()
        except: pass

        return {"message": "Purge completed", "month_year": body.month_year}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))