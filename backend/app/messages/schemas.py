from pydantic import BaseModel
from typing import Optional


class CreateConversationRequest(BaseModel):
    other_user_id: str
    listing_id: Optional[str] = None
    initial_message: Optional[str] = None


class SendMessageRequest(BaseModel):
    text: str
    attachment_url: Optional[str] = None
    attachment_name: Optional[str] = None
    attachment_size: Optional[str] = None


class ConversationResponse(BaseModel):
    id: str
    other_user_id: str
    other_user_name: Optional[str] = None
    other_user_avatar: Optional[str] = None
    listing_id: Optional[str] = None
    last_message_at: Optional[str] = None
    last_message_text: Optional[str] = None
    unread_count: int = 0
    status: str = "accepted"
    initiated_by: Optional[str] = None


class MessageResponse(BaseModel):
    id: str
    conversation_id: str
    sender_id: str
    text: Optional[str] = None
    attachment_url: Optional[str] = None
    attachment_name: Optional[str] = None
    attachment_size: Optional[str] = None
    created_at: str


class BlockUserRequest(BaseModel):
    user_id: str
    reason: Optional[str] = None


class BlockedUserResponse(BaseModel):
    id: str
    blocked_id: str
    blocked_name: Optional[str] = None
    blocked_avatar: Optional[str] = None
    created_at: str
