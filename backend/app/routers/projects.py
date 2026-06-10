from fastapi import APIRouter, HTTPException, Depends
from app.config import supabase
from app.dependencies import require_admin
from app.models.schemas import CreateProjectRequest, CreateLineRequest, CreateStationRequest

router = APIRouter(prefix="/projects", tags=["Projects"])


# ── PROJECTS ──────────────────────────────────────────────────

@router.get("/")
def list_projects(current_user: dict = Depends(require_admin)):
    result = supabase.table("projects").select(
        "*, lines(id, line_type, is_active, stations(id, station_code, capacity, is_active))"
    ).eq("is_active", True).order("project_number").execute()

    # Only return active lines and active stations
    projects = result.data or []
    for p in projects:
        p["lines"] = [l for l in p.get("lines", []) if l.get("is_active")]
        for l in p["lines"]:
            l["stations"] = [s for s in l.get("stations", []) if s.get("is_active")]
    return projects


@router.post("/")
def create_project(body: CreateProjectRequest, current_user: dict = Depends(require_admin)):
    # Check if project exists including inactive
    existing = supabase.table("projects").select("id, is_active").eq("project_number", body.project_number).execute()

    if existing.data:
        if existing.data[0]["is_active"]:
            raise HTTPException(status_code=400, detail="Project number already exists")
        else:
            # Reactivate project ONLY — lines and stations stay inactive
            result = supabase.table("projects").update({
                "is_active": True,
                "name": body.name or f"Project {body.project_number}"
            }).eq("project_number", body.project_number).execute()
            return {"message": "Project reactivated", "project": result.data[0]}

    result = supabase.table("projects").insert({
        "project_number": body.project_number,
        "name": body.name or f"Project {body.project_number}",
    }).execute()

    return {"message": "Project created", "project": result.data[0]}


@router.delete("/{project_id}")
def delete_project(project_id: int, current_user: dict = Depends(require_admin)):
    # Deactivate all stations under this project's lines
    lines = supabase.table("lines").select("id").eq("project_id", project_id).execute()

    if lines.data:
        line_ids = [l["id"] for l in lines.data]
        for line_id in line_ids:
            supabase.table("stations").update(
                {"is_active": False}
            ).eq("line_id", line_id).execute()

        supabase.table("lines").update(
            {"is_active": False}
        ).eq("project_id", project_id).execute()

    # Deactivate the project itself
    result = supabase.table("projects").update(
        {"is_active": False}
    ).eq("id", project_id).execute()

    if not result.data:
        raise HTTPException(status_code=404, detail="Project not found")

    return {"message": "Project and all its lines and stations removed"}


# ── LINES ──────────────────────────────────────────────────────

@router.get("/lines")
def list_lines(current_user: dict = Depends(require_admin)):
    result = supabase.table("lines").select(
        "*, projects(project_number, name), stations(id, station_code, capacity)"
    ).eq("is_active", True).execute()
    return result.data or []


@router.post("/lines")
def create_line(body: CreateLineRequest, current_user: dict = Depends(require_admin)):
    # Check if active line with same type exists
    existing = supabase.table("lines").select("id, is_active").eq(
        "project_id", body.project_id
    ).eq("line_type", body.line_type).execute()

    if existing.data:
        if existing.data[0]["is_active"]:
            raise HTTPException(status_code=400, detail="This line type already exists for this project")
        else:
            # Reactivate the old line
            result = supabase.table("lines").update(
                {"is_active": True}
            ).eq("project_id", body.project_id).eq("line_type", body.line_type).execute()
            return {"message": "Line reactivated", "line": result.data[0]}

    result = supabase.table("lines").insert({
        "project_id": body.project_id,
        "line_type": body.line_type,
    }).execute()

    return {"message": "Line created", "line": result.data[0]}


@router.delete("/lines/{line_id}")
def delete_line(line_id: str, current_user: dict = Depends(require_admin)):
    # Deactivate all stations in this line first
    supabase.table("stations").update(
        {"is_active": False}
    ).eq("line_id", line_id).execute()

    result = supabase.table("lines").update(
        {"is_active": False}
    ).eq("id", line_id).execute()

    if not result.data:
        raise HTTPException(status_code=404, detail="Line not found")

    return {"message": "Line and all its stations removed"}


# ── STATIONS ───────────────────────────────────────────────────

@router.get("/stations")
def list_stations(line_id: str = None, current_user: dict = Depends(require_admin)):
    query = supabase.table("stations").select(
        "*, lines(line_type, projects(project_number))"
    ).eq("is_active", True)
    if line_id:
        query = query.eq("line_id", line_id)
    result = query.order("station_code").execute()
    return result.data or []


@router.post("/stations")
def create_station(body: CreateStationRequest, current_user: dict = Depends(require_admin)):
    # Check if active station with same code exists
    existing = supabase.table("stations").select("id, is_active").eq(
        "line_id", body.line_id
    ).eq("station_code", body.station_code.upper()).execute()

    if existing.data:
        if existing.data[0]["is_active"]:
            raise HTTPException(status_code=400, detail="Station code already exists in this line")
        else:
            # Reactivate the old station
            result = supabase.table("stations").update({
                "is_active": True,
                "capacity": body.capacity
            }).eq("line_id", body.line_id).eq("station_code", body.station_code.upper()).execute()
            return {"message": "Station reactivated", "station": result.data[0]}

    result = supabase.table("stations").insert({
        "line_id": body.line_id,
        "station_code": body.station_code.upper(),
        "capacity": body.capacity,
    }).execute()

    return {"message": "Station created", "station": result.data[0]}


@router.delete("/stations/{station_id}")
def delete_station(station_id: str, current_user: dict = Depends(require_admin)):
    result = supabase.table("stations").update(
        {"is_active": False}
    ).eq("id", station_id).execute()

    if not result.data:
        raise HTTPException(status_code=404, detail="Station not found")

    return {"message": "Station removed"}