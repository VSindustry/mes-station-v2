from pydantic import BaseModel, Field
from typing import Optional, Literal
from datetime import datetime

# AUTH
class PINLoginRequest(BaseModel):
    employee_id: str
    pin: str

class QRLoginRequest(BaseModel):
    qr_content: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_id: str
    employee_id: str
    full_name: str
    role: str
    project_id: Optional[int] = None
    line_id: Optional[str] = None
    shift: Optional[str] = None
    expires_in: int

# USERS
class RegisterLeaderRequest(BaseModel):
    employee_id: str = Field(..., min_length=3, max_length=20)
    full_name: str = Field(..., min_length=2, max_length=120)
    short_name: Optional[str] = None
    role: Literal["main_leader", "assistant_leader", "floater"]
    project_id: int
    line_id: str
    shift: Literal["Morning", "Night"]
    pin: str = Field(..., min_length=1, max_length=50)
    badge_number: Optional[str] = None
    language_pref: Literal["en", "ms", "vi", "ne"] = "en"

class RegisterOperatorRequest(BaseModel):
    employee_id: str = Field(..., min_length=3, max_length=20)
    full_name: str = Field(..., min_length=2, max_length=120)
    short_name: Optional[str] = None
    badge_number: Optional[str] = None
    station_id: Optional[str] = None
    language_pref: Literal["en", "ms", "vi", "ne"] = "en"

class AdminAddOperatorRequest(BaseModel):
    employee_id: str = Field(..., min_length=3, max_length=20)
    full_name: str = Field(..., min_length=2, max_length=120)
    short_name: Optional[str] = None
    project_id: int
    line_id: str
    station_id: str
    shift: Literal["Morning", "Night"]
    badge_number: Optional[str] = None
    language_pref: Literal["en", "ms", "vi", "ne"] = "en"

class UpdateUserStatusRequest(BaseModel):
    status: Literal["active", "inactive", "suspended"]
    note: Optional[str] = None

class ChangePINRequest(BaseModel):
    current_pin: str = Field(..., min_length=6, max_length=50)
    new_pin: str = Field(..., min_length=6, max_length=50)

class RemoveUserRequest(BaseModel):
    note: Optional[str] = None

# PROJECTS
class CreateProjectRequest(BaseModel):
    project_number: str = Field(..., min_length=1, max_length=20)
    name: Optional[str] = None

# LINES
class CreateLineRequest(BaseModel):
    project_id: int
    line_type: Literal["Mainline", "Miniline", "Subline", "Packing"]

# STATIONS
class CreateStationRequest(BaseModel):
    line_id: str
    station_code: str = Field(..., min_length=1, max_length=20)
    capacity: int = Field(default=1, ge=1, le=10)

# ASSIGNMENTS
class CreateAssignmentRequest(BaseModel):
    station_id: str
    user_id: str
    month_year: str
    shift: Literal["Morning", "Night"]

class ApproveRejectRequest(BaseModel):
    action: Literal["approve", "reject"]
    reason: Optional[str] = None

# EXPORT
class ExportRequest(BaseModel):
    report_type: Optional[str] = "active"  # "active" or "removed"
    project_id: Optional[int] = None
    line_id: Optional[str] = None
    shift: Optional[str] = None
    month_year: Optional[str] = None
# QR
class PrintQRRequest(BaseModel):
    user_ids: list[str]