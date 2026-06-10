from fastapi import APIRouter, HTTPException, Depends
from app.config import supabase
from app.dependencies import get_current_user, require_admin, require_leader
from app.models.schemas import CreateAssignmentRequest, ApproveRejectRequest
from datetime import datetime, timezone, date

router = APIRouter(prefix="/assignments", tags=["Assignments"])


def current_month_start() -> str:
    today = date.today()
    return date(today.year, today.month, 1).isoformat()


@router.get("/")
def list_assignments(current_user: dict = Depends(require_leader)):
    month = current_month_start()
    if current_user["role"] == "mes_admin":
        result = supabase.table("station_assignments").select(
            "*, stations!station_assignments_station_id_fkey(station_code, capacity, line_id, lines(line_type, project_id, projects(project_number))), users!station_assignments_user_id_fkey(full_name, employee_id, role, shift)"
        ).eq("month_year", month).execute()
    else:
        # Get all station IDs for this leader's line
        line_stations = supabase.table("stations").select("id").eq(
            "line_id", current_user.get("line_id")
        ).execute()
        station_ids = [s["id"] for s in (line_stations.data or [])]

        if not station_ids:
            return []

        result = supabase.table("station_assignments").select(
            "*, stations!station_assignments_station_id_fkey(station_code, capacity, line_id, lines(line_type, project_id, projects(project_number))), users!station_assignments_user_id_fkey(full_name, employee_id, role, shift)"
        ).eq("month_year", month).in_("station_id", station_ids).execute()

    return result.data or []


@router.get("/pending")
def list_pending(current_user: dict = Depends(require_admin)):
    result = supabase.table("station_assignments").select(
        "*, stations!station_assignments_station_id_fkey(station_code, capacity), users!station_assignments_user_id_fkey(full_name, employee_id, role)"
    ).eq("status", "pending").execute()
    return result.data or []


@router.get("/occupancy")
def get_occupancy(
    project_id: int = None,
    line_id: str = None,
    shift: str = None,
    current_user: dict = Depends(get_current_user)
):
    query = supabase.table("station_occupancy").select("*")
    if project_id:
        query = query.eq("project_id", project_id)
    if line_id:
        query = query.eq("line_id", line_id)
    if shift:
        query = query.eq("shift", shift)
    if current_user["role"] != "mes_admin":
        query = query.eq("line_id", current_user.get("line_id"))
        query = query.eq("shift", current_user.get("shift"))
    result = query.execute()
    data = result.data or []
    for row in data:
        if row.get("shift"):
            row["shift"] = str(row["shift"])
    return data


@router.get("/station/{station_id}")
def get_station_detail(station_id: str, shift: str = None, current_user: dict = Depends(get_current_user)):
    month = current_month_start()

    # Get station info
    station = supabase.table("stations").select(
        "*, lines(id, line_type, projects(project_number, name))"
    ).eq("id", station_id).single().execute()

    if not station.data:
        raise HTTPException(status_code=404, detail="Station not found")

    line_id = station.data["lines"]["id"]

    # Get operators assigned to this station
    assignments_query = supabase.table("station_assignments").select(
        "*, users!station_assignments_user_id_fkey(id, full_name, employee_id, role, shift)"
    ).eq("station_id", station_id).eq("month_year", month).eq("status", "active")

    if shift:
        assignments_query = assignments_query.eq("shift", shift)

    assignments = assignments_query.execute()

    # Get leaders for EXACT line_id only
    leaders_query = supabase.table("users").select(
        "id, full_name, employee_id, role, shift, line_id"
    ).eq("line_id", line_id).in_(
        "role", ["main_leader", "assistant_leader", "floater"]
    ).eq("status", "active")

    if shift:
        leaders_query = leaders_query.eq("shift", shift)

    leaders = leaders_query.execute()

    return {
        "station": station.data,
        "assignments": assignments.data or [],
        "leaders": leaders.data or []
    }


@router.post("/")
def create_assignment(body: CreateAssignmentRequest, current_user: dict = Depends(require_leader)):
    station = supabase.table("stations").select("capacity").eq("id", body.station_id).single().execute()
    if not station.data:
        raise HTTPException(status_code=404, detail="Station not found")

    current_count = supabase.table("station_assignments").select(
        "id", count="exact"
    ).eq("station_id", body.station_id).eq(
        "month_year", body.month_year
    ).eq("shift", body.shift).in_("status", ["active", "pending"]).execute()

    if current_count.count >= station.data["capacity"]:
        raise HTTPException(status_code=400, detail="Station is at full capacity for this shift")

    existing = supabase.table("station_assignments").select("id").eq(
        "user_id", body.user_id
    ).eq("month_year", body.month_year).eq("shift", body.shift).in_(
        "status", ["active", "pending"]
    ).execute()
    if existing.data:
        raise HTTPException(status_code=400, detail="Operator already assigned this month for this shift")

    result = supabase.table("station_assignments").insert({
        "station_id": body.station_id,
        "user_id": body.user_id,
        "assigned_by": current_user["sub"],
        "month_year": body.month_year,
        "shift": body.shift,
        "status": "pending"
    }).execute()

    return {"message": "Assignment created — awaiting admin approval", "data": result.data[0]}


@router.patch("/{assignment_id}/approve-reject")
def approve_reject(assignment_id: str, body: ApproveRejectRequest, current_user: dict = Depends(require_admin)):
    update = {
        "status": "active" if body.action == "approve" else "rejected",
        "approved_by": current_user["sub"],
        "approved_at": datetime.now(timezone.utc).isoformat()
    }
    if body.action == "reject":
        update["reject_reason"] = body.reason

    result = supabase.table("station_assignments").update(update).eq("id", assignment_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Assignment not found")

    return {"message": f"Assignment {body.action}d successfully"}


@router.delete("/{assignment_id}")
def remove_assignment(assignment_id: str, current_user: dict = Depends(require_leader)):
    result = supabase.table("station_assignments").update({
        "status": "expired"
    }).eq("id", assignment_id).execute()

    if not result.data:
        raise HTTPException(status_code=404, detail="Assignment not found")

    return {"message": "Assignment removed"}