from fastapi import APIRouter, HTTPException, Depends
from app.config import supabase
from app.dependencies import get_current_user

router = APIRouter(prefix="/notifications", tags=["Notifications"])


@router.get("/")
def get_notifications(current_user: dict = Depends(get_current_user)):
    result = supabase.table("notifications").select("*").eq(
        "user_id", current_user["sub"]
    ).order("created_at", desc=True).limit(50).execute()
    return result.data or []


@router.patch("/mark-all-read")
def mark_all_read(current_user: dict = Depends(get_current_user)):
    supabase.table("notifications").update(
        {"is_read": True}
    ).eq("user_id", current_user["sub"]).execute()
    return {"message": "All notifications marked as read"}


@router.patch("/{notif_id}/read")
def mark_read(notif_id: str, current_user: dict = Depends(get_current_user)):
    result = supabase.table("notifications").update(
        {"is_read": True}
    ).eq("id", notif_id).eq("user_id", current_user["sub"]).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Notification not found")
    return {"message": "Notification marked as read"}


@router.delete("/{notif_id}")
def delete_notification(notif_id: str, current_user: dict = Depends(get_current_user)):
    supabase.table("notifications").delete().eq(
        "id", notif_id
    ).eq("user_id", current_user["sub"]).execute()
    return {"message": "Notification deleted"}