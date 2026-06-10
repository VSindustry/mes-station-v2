from fastapi import APIRouter, HTTPException, Depends
from app.config import supabase
from app.dependencies import get_current_user, require_admin, require_leader, require_main_leader, can_remove_user
from app.models.schemas import RegisterLeaderRequest, RegisterOperatorRequest, AdminAddOperatorRequest, UpdateUserStatusRequest, ChangePINRequest, RemoveUserRequest
from passlib.context import CryptContext
from datetime import datetime, timezone
import secrets
import time

router = APIRouter(prefix="/users", tags=["Users"])
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def make_email(employee_id: str) -> str:
    return f"{employee_id.lower()}@mes.internal"


def hard_delete_user(employee_id: str):
    try:
        email = make_email(employee_id)
        existing = supabase.table("users").select("id").eq(
            "employee_id", employee_id.upper()
        ).execute()
        user_id = existing.data[0]["id"] if existing.data else None

        if user_id:
            try:
                supabase.table("audit_log").delete().eq("target_user_id", user_id).execute()
            except: pass
            try:
                supabase.table("qr_tokens").delete().eq("user_id", user_id).execute()
            except: pass
            try:
                supabase.table("users").delete().eq("id", user_id).execute()
            except: pass
            try:
                supabase.auth.admin.delete_user(user_id)
            except: pass

        # Also search by email in case id mismatch
        try:
            users_list = supabase.auth.admin.list_users()
            for u in users_list:
                if hasattr(u, 'email') and u.email == email:
                    supabase.auth.admin.delete_user(u.id)
                    break
        except: pass

    except: pass


def create_auth_user(email: str, password: str) -> object:
    # Find and delete any existing auth user with this email
    try:
        users_list = supabase.auth.admin.list_users()
        for u in users_list:
            if hasattr(u, 'email') and u.email == email:
                supabase.auth.admin.delete_user(u.id)
                time.sleep(0.5)
                break
    except: pass

    time.sleep(0.3)

    try:
        return supabase.auth.admin.create_user({
            "email": email,
            "password": password,
            "email_confirm": True
        })
    except Exception as e:
        # Last resort — update existing
        try:
            users_list = supabase.auth.admin.list_users()
            for u in users_list:
                if hasattr(u, 'email') and u.email == email:
                    return supabase.auth.admin.update_user_by_id(
                        u.id,
                        {"password": password, "email_confirm": True}
                    )
        except: pass
        raise HTTPException(status_code=500, detail=f"Registration failed: {str(e)}")


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


@router.get("/projects")
def get_projects(current_user: dict = Depends(get_current_user)):
    result = supabase.table("projects").select("*").eq("is_active", True).order("project_number").execute()
    return result.data or []


@router.get("/lines")
def get_lines(project_id: int, current_user: dict = Depends(get_current_user)):
    result = supabase.table("lines").select("*").eq("project_id", project_id).eq("is_active", True).execute()
    return result.data or []


@router.get("/stations")
def get_stations(line_id: str, current_user: dict = Depends(get_current_user)):
    result = supabase.table("stations").select("*").eq("line_id", line_id).eq("is_active", True).order("station_code").execute()
    return result.data or []


@router.get("/me")
def get_me(current_user: dict = Depends(get_current_user)):
    user = supabase.table("users").select(
        "*, projects(project_number, name), lines(line_type)"
    ).eq("id", current_user["sub"]).single().execute()
    if not user.data:
        raise HTTPException(status_code=404, detail="User not found")
    user.data.pop("pin_hash", None)
    return user.data


@router.get("/")
def list_users(current_user: dict = Depends(require_leader)):
    if current_user["role"] == "mes_admin":
        result = supabase.table("users").select(
            "*, projects(project_number, name), lines(line_type)"
        ).neq("status", "inactive").execute()
    else:
        result = supabase.table("users").select(
            "*, projects(project_number, name), lines(line_type)"
        ).eq("line_id", current_user.get("line_id")).neq("status", "inactive").execute()
    data = result.data or []
    for u in data:
        u.pop("pin_hash", None)
    return data


@router.post("/register-leader")
def register_leader(body: RegisterLeaderRequest, current_user: dict = Depends(require_main_leader)):

    if body.role in ['main_leader', 'assistant_leader']:
        existing_role = supabase.table("users").select("id").eq(
            "line_id", body.line_id
        ).eq("role", body.role).eq("shift", body.shift).in_("status", ["active", "pending"]).execute()
        if existing_role.data:
            role_label = "Main Leader" if body.role == "main_leader" else "Assistant Leader"
            raise HTTPException(status_code=400, detail=f"A {role_label} already exists for this line and shift")

    if body.role == 'floater':
        existing_floaters = supabase.table("users").select("id").eq(
            "line_id", body.line_id
        ).eq("role", "floater").eq("shift", body.shift).in_("status", ["active", "pending"]).execute()
        if len(existing_floaters.data) >= 2:
            raise HTTPException(status_code=400, detail="Maximum 2 floaters allowed per line per shift")

    existing = supabase.table("users").select("id, status").eq("employee_id", body.employee_id.upper()).execute()
    if existing.data and existing.data[0]["status"] in ["active", "pending"]:
        raise HTTPException(status_code=400, detail="Employee ID already exists and is active")

    hard_delete_user(body.employee_id)
    time.sleep(0.5)

    pin_hash = pwd_context.hash(body.pin)
    email = make_email(body.employee_id)
    auth_user = create_auth_user(email, body.pin)

    is_admin = current_user["role"] == "mes_admin"

    new_user = supabase.table("users").insert({
        "id": auth_user.user.id,
        "employee_id": body.employee_id.upper(),
        "full_name": body.full_name,
        "short_name": body.short_name or body.full_name.split()[0],
        "role": body.role,
        "project_id": body.project_id,
        "line_id": body.line_id,
        "shift": body.shift,
        "pin_hash": pin_hash,
        "badge_number": body.badge_number or body.pin,
        "language_pref": body.language_pref,
        "status": "active" if is_admin else "pending",
        "created_by": current_user["sub"],
        "approved_by": current_user["sub"] if is_admin else None,
        "approved_at": datetime.now(timezone.utc).isoformat() if is_admin else None,
    }).execute()

    log_audit(
        actor_id=current_user["sub"],
        action="user_registered",
        target_user_id=new_user.data[0]["id"],
        target_table="users",
        target_id=new_user.data[0]["id"],
        new_data={"employee_id": body.employee_id.upper(), "role": body.role, "shift": body.shift},
        note=f"{'Admin' if is_admin else 'Leader'} registered {body.role.replace('_', ' ')} {body.full_name}"
    )

    msg = "Leader registered successfully!" if is_admin else "Leader registered — awaiting admin approval"
    return {"message": msg, "user": new_user.data[0]}


@router.post("/register-operator")
def register_operator(body: RegisterOperatorRequest, current_user: dict = Depends(require_leader)):
    if current_user["role"] == "mes_admin":
        raise HTTPException(status_code=400, detail="Admin should use /admin-add-operator")

    month_year = datetime.now(timezone.utc).strftime("%Y-%m-01")
    if body.station_id:
        station = supabase.table("stations").select("capacity, station_code").eq(
            "id", body.station_id
        ).single().execute()
        if station.data:
            current_count = supabase.table("station_assignments").select(
                "id", count="exact"
            ).eq("station_id", body.station_id).eq(
                "month_year", month_year
            ).eq("shift", current_user.get("shift")).in_("status", ["active", "pending"]).execute()
            if current_count.count >= station.data["capacity"]:
                raise HTTPException(
                    status_code=400,
                    detail=f"Station {station.data['station_code']} is at full capacity for this shift"
                )

    existing = supabase.table("users").select("id, status").eq("employee_id", body.employee_id.upper()).execute()
    if existing.data and existing.data[0]["status"] in ["active", "pending"]:
        raise HTTPException(status_code=400, detail="Employee ID already exists and is active")

    hard_delete_user(body.employee_id)
    time.sleep(0.5)

    temp_pass = secrets.token_hex(16)
    email = make_email(body.employee_id)
    auth_user = create_auth_user(email, temp_pass)

    new_user = supabase.table("users").insert({
        "id": auth_user.user.id,
        "employee_id": body.employee_id.upper(),
        "full_name": body.full_name,
        "short_name": body.short_name or body.full_name.split()[0],
        "role": "operator",
        "project_id": current_user.get("project_id"),
        "line_id": current_user.get("line_id"),
        "shift": current_user.get("shift"),
        "badge_number": body.badge_number,
        "language_pref": body.language_pref,
        "status": "pending",
        "created_by": current_user["sub"]
    }).execute()

    operator_id = new_user.data[0]["id"]

    if body.station_id:
        supabase.table("station_assignments").insert({
            "station_id": body.station_id,
            "user_id": operator_id,
            "assigned_by": current_user["sub"],
            "month_year": month_year,
            "shift": current_user.get("shift"),
            "status": "pending",
            "snapshot_name": body.full_name,
            "snapshot_employee_id": body.employee_id.upper(),
            "snapshot_role": "operator",
            "snapshot_badge_number": body.badge_number or None,
        }).execute()

    log_audit(
        actor_id=current_user["sub"],
        action="user_registered",
        target_user_id=operator_id,
        target_table="users",
        target_id=operator_id,
        new_data={"employee_id": body.employee_id.upper(), "role": "operator"},
        note=f"Leader registered operator {body.full_name} — pending approval"
    )

    return {"message": "Operator registered — awaiting admin approval", "user": new_user.data[0]}


@router.post("/admin-add-operator")
def admin_add_operator(body: AdminAddOperatorRequest, current_user: dict = Depends(require_admin)):
    existing = supabase.table("users").select("id, status").eq("employee_id", body.employee_id.upper()).execute()
    if existing.data and existing.data[0]["status"] in ["active", "pending"]:
        raise HTTPException(status_code=400, detail="Employee ID already exists and is active")

    hard_delete_user(body.employee_id)
    time.sleep(0.5)

    station = supabase.table("stations").select("capacity").eq("id", body.station_id).single().execute()
    if not station.data:
        raise HTTPException(status_code=404, detail="Station not found")

    month_year = datetime.now(timezone.utc).strftime("%Y-%m-01")
    current_count = supabase.table("station_assignments").select(
        "id", count="exact"
    ).eq("station_id", body.station_id).eq(
        "month_year", month_year
    ).eq("shift", body.shift).in_("status", ["active", "pending"]).execute()

    if current_count.count >= station.data["capacity"]:
        raise HTTPException(status_code=400, detail="Station is at full capacity for this shift")

    temp_pass = secrets.token_hex(16)
    email = make_email(body.employee_id)
    auth_user = create_auth_user(email, temp_pass)

    new_user = supabase.table("users").insert({
        "id": auth_user.user.id,
        "employee_id": body.employee_id.upper(),
        "full_name": body.full_name,
        "short_name": body.short_name or body.full_name.split()[0],
        "role": "operator",
        "project_id": body.project_id,
        "line_id": body.line_id,
        "shift": body.shift,
        "badge_number": body.badge_number,
        "language_pref": body.language_pref,
        "status": "active",
        "created_by": current_user["sub"],
        "approved_by": current_user["sub"],
        "approved_at": datetime.now(timezone.utc).isoformat()
    }).execute()

    operator_id = new_user.data[0]["id"]

    supabase.table("station_assignments").insert({
        "station_id": body.station_id,
        "user_id": operator_id,
        "assigned_by": current_user["sub"],
        "month_year": month_year,
        "shift": body.shift,
        "status": "active",
        "approved_by": current_user["sub"],
        "approved_at": datetime.now(timezone.utc).isoformat(),
        "snapshot_name": body.full_name,
        "snapshot_employee_id": body.employee_id.upper(),
        "snapshot_role": "operator",
        "snapshot_badge_number": body.badge_number or None,
    }).execute()

    log_audit(
        actor_id=current_user["sub"],
        action="user_registered",
        target_user_id=operator_id,
        target_table="users",
        target_id=operator_id,
        new_data={"employee_id": body.employee_id.upper(), "role": "operator", "station_id": body.station_id, "shift": body.shift},
        note=f"Admin added operator {body.full_name} and assigned to station"
    )

    return {"message": "Operator added and assigned successfully", "user": new_user.data[0]}


@router.patch("/{user_id}/approve")
def approve_user(user_id: str, current_user: dict = Depends(require_admin)):
    old = supabase.table("users").select(
        "status, full_name, employee_id, role, shift, line_id, project_id, badge_number"
    ).eq("id", user_id).single().execute()

    if not old.data:
        raise HTTPException(status_code=404, detail="User not found")

    u = old.data
    month_year = datetime.now(timezone.utc).strftime("%Y-%m-01")

    if u["role"] in ["assistant_leader", "main_leader"]:
        existing_role = supabase.table("users").select("id").eq(
            "line_id", u["line_id"]
        ).eq("role", u["role"]).eq("shift", u["shift"]).eq("status", "active").neq("id", user_id).execute()
        if existing_role.data:
            role_label = "Main Leader" if u["role"] == "main_leader" else "Assistant Leader"
            raise HTTPException(status_code=400, detail=f"A {role_label} already exists for this line and shift — cannot approve")

    if u["role"] == "floater":
        existing_floaters = supabase.table("users").select("id").eq(
            "line_id", u["line_id"]
        ).eq("role", "floater").eq("shift", u["shift"]).eq("status", "active").neq("id", user_id).execute()
        if len(existing_floaters.data) >= 2:
            raise HTTPException(status_code=400, detail="Maximum 2 floaters already active for this line and shift — cannot approve")

    if u["role"] == "operator":
        pending_assignment = supabase.table("station_assignments").select(
            "id, station_id, shift"
        ).eq("user_id", user_id).eq("status", "pending").execute()

        if pending_assignment.data:
            assignment = pending_assignment.data[0]
            station_id = assignment["station_id"]
            shift = assignment["shift"]

            station = supabase.table("stations").select("capacity, station_code").eq(
                "id", station_id
            ).single().execute()

            if station.data:
                current_count = supabase.table("station_assignments").select(
                    "id", count="exact"
                ).eq("station_id", station_id).eq(
                    "month_year", month_year
                ).eq("shift", shift).eq("status", "active").execute()

                if current_count.count >= station.data["capacity"]:
                    raise HTTPException(
                        status_code=400,
                        detail=f"Station {station.data['station_code']} is at full capacity ({station.data['capacity']}) for {shift} shift — cannot approve"
                    )

            supabase.table("station_assignments").update({
                "status": "active",
                "approved_by": current_user["sub"],
                "approved_at": datetime.now(timezone.utc).isoformat(),
                "snapshot_name": u["full_name"],
                "snapshot_employee_id": u["employee_id"],
                "snapshot_role": "operator",
                "snapshot_badge_number": u.get("badge_number"),
            }).eq("id", assignment["id"]).execute()

    result = supabase.table("users").update({
        "status": "active",
        "approved_by": current_user["sub"],
        "approved_at": datetime.now(timezone.utc).isoformat()
    }).eq("id", user_id).execute()

    if not result.data:
        raise HTTPException(status_code=404, detail="User not found")

    log_audit(
        actor_id=current_user["sub"],
        action="user_approved",
        target_user_id=user_id,
        target_table="users",
        target_id=user_id,
        old_data={"status": u.get("status")},
        new_data={"status": "active"},
        note=f"Approved {u.get('role', '').replace('_', ' ')} {u.get('full_name', '')} ({u.get('employee_id', '')})"
    )

    return {"message": "User approved successfully"}


@router.patch("/{user_id}/reject")
def reject_user(user_id: str, current_user: dict = Depends(require_admin)):
    old = supabase.table("users").select("status, full_name, employee_id, role").eq("id", user_id).single().execute()

    if old.data:
        hard_delete_user(old.data.get("employee_id", ""))

    log_audit(
        actor_id=current_user["sub"],
        action="user_rejected",
        target_user_id=user_id,
        target_table="users",
        target_id=user_id,
        old_data={"status": old.data.get("status")} if old.data else None,
        new_data={"status": "deleted"},
        note=f"Rejected and deleted {old.data.get('role', '').replace('_', ' ')} {old.data.get('full_name', '')} ({old.data.get('employee_id', '')})"
    )

    return {"message": "User rejected and removed"}


@router.delete("/{user_id}")
def remove_user(user_id: str, current_user: dict = Depends(require_leader)):
    target = supabase.table("users").select("role, employee_id, full_name").eq("id", user_id).single().execute()
    if not target.data:
        raise HTTPException(status_code=404, detail="User not found")

    if not can_remove_user(current_user["role"], target.data["role"]):
        raise HTTPException(status_code=403, detail="You cannot remove this user")

    log_audit(
        actor_id=current_user["sub"],
        action="user_removed",
        target_user_id=user_id,
        target_table="users",
        target_id=user_id,
        old_data={"role": target.data["role"], "employee_id": target.data["employee_id"]},
        new_data={"status": "deleted"},
        note=f"Removed {target.data['role'].replace('_', ' ')} {target.data['full_name']} ({target.data['employee_id']})"
    )

    hard_delete_user(target.data["employee_id"])

    return {"message": "User removed permanently"}


@router.post("/change-pin")
def change_pin(body: ChangePINRequest, current_user: dict = Depends(get_current_user)):
    user = supabase.table("users").select("pin_hash, full_name, employee_id").eq(
        "id", current_user["sub"]
    ).single().execute()

    if not user.data:
        raise HTTPException(status_code=404, detail="User not found")
    if not pwd_context.verify(body.current_pin, user.data["pin_hash"]):
        raise HTTPException(status_code=400, detail="Current PIN is incorrect")

    new_hash = pwd_context.hash(body.new_pin)
    supabase.table("users").update({"pin_hash": new_hash}).eq(
        "id", current_user["sub"]
    ).execute()

    log_audit(
        actor_id=current_user["sub"],
        action="pin_changed",
        target_user_id=current_user["sub"],
        target_table="users",
        target_id=current_user["sub"],
        note=f"{user.data.get('full_name', '')} ({user.data.get('employee_id', '')}) changed their PIN"
    )

    return {"message": "PIN changed successfully"}