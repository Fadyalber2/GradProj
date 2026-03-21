from fastapi import APIRouter, HTTPException, Depends
from app.messages.schemas import (
    CreateConversationRequest,
    SendMessageRequest,
    ConversationResponse,
    MessageResponse,
    BlockUserRequest,
    BlockedUserResponse,
)
from app.database import supabase_admin
from app.dependencies import get_current_user

router = APIRouter()


# ---------------------------------------------------------------------------
# Helper functions
# ---------------------------------------------------------------------------

def _get_other_user_id(conv: dict, user_id: str) -> str:
    """Return the ID of the other participant in a conversation."""
    if conv["user_a_id"] == user_id:
        return conv["user_b_id"]
    return conv["user_a_id"]


def _verify_participation(conv: dict, user_id: str) -> None:
    """Raise 403 if user_id is not a participant of the conversation."""
    if conv["user_a_id"] != user_id and conv["user_b_id"] != user_id:
        raise HTTPException(status_code=403, detail="Not a participant of this conversation")


def _fetch_conversation(conversation_id: str) -> dict:
    """Fetch a conversation by ID. Raises 404 if not found."""
    try:
        result = (
            supabase_admin.table("conversations")
            .select("id, user_a_id, user_b_id, status, initiated_by")
            .eq("id", conversation_id)
            .single()
            .execute()
        )
    except Exception:
        raise HTTPException(status_code=404, detail="Conversation not found")

    if not result.data:
        raise HTTPException(status_code=404, detail="Conversation not found")

    return result.data


# ---------------------------------------------------------------------------
# Block endpoints (must be before /conversations/{id} catch-all)
# ---------------------------------------------------------------------------

@router.post("/block")
async def block_user(
    body: BlockUserRequest,
    current_user: dict = Depends(get_current_user),
):
    """Block a user. Also rejects any active conversations with them."""
    user_id = current_user["id"]
    blocked_id = body.user_id

    if user_id == blocked_id:
        raise HTTPException(status_code=400, detail="Cannot block yourself")

    # Check if already blocked
    try:
        existing = (
            supabase_admin.table("blocked_users")
            .select("id")
            .eq("blocker_id", user_id)
            .eq("blocked_id", blocked_id)
            .execute()
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {e}")

    if existing.data:
        return {"detail": "User already blocked"}

    # Insert block record
    block_data: dict = {
        "blocker_id": user_id,
        "blocked_id": blocked_id,
    }
    if body.reason:
        block_data["reason"] = body.reason

    try:
        supabase_admin.table("blocked_users").insert(block_data).execute()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to block user: {e}")

    # Reject any active conversations between these two users
    try:
        convs = (
            supabase_admin.table("conversations")
            .select("id")
            .or_(
                f"and(user_a_id.eq.{user_id},user_b_id.eq.{blocked_id}),"
                f"and(user_a_id.eq.{blocked_id},user_b_id.eq.{user_id})"
            )
            .in_("status", ["accepted", "pending"])
            .execute()
        )
        for conv in (convs.data or []):
            supabase_admin.table("conversations").update(
                {"status": "rejected"}
            ).eq("id", conv["id"]).execute()
    except Exception:
        pass  # Best-effort

    return {"detail": "User blocked"}


@router.delete("/block/{blocked_user_id}")
async def unblock_user(
    blocked_user_id: str,
    current_user: dict = Depends(get_current_user),
):
    """Unblock a user."""
    user_id = current_user["id"]

    try:
        result = (
            supabase_admin.table("blocked_users")
            .delete()
            .eq("blocker_id", user_id)
            .eq("blocked_id", blocked_user_id)
            .execute()
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {e}")

    if not result.data:
        raise HTTPException(status_code=404, detail="Block record not found")

    return {"detail": "User unblocked"}


@router.get("/blocked", response_model=list[BlockedUserResponse])
async def list_blocked_users(current_user: dict = Depends(get_current_user)):
    """List all users blocked by the current user, with profile enrichment."""
    user_id = current_user["id"]

    try:
        result = (
            supabase_admin.table("blocked_users")
            .select("id, blocked_id, created_at")
            .eq("blocker_id", user_id)
            .order("created_at", desc=True)
            .execute()
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {e}")

    blocked_list = []
    for record in (result.data or []):
        # Enrich with profile info
        profile: dict = {}
        try:
            p_result = (
                supabase_admin.table("profiles")
                .select("full_name, avatar_url")
                .eq("id", record["blocked_id"])
                .single()
                .execute()
            )
            profile = p_result.data or {}
        except Exception:
            pass

        blocked_list.append({
            "id": record["id"],
            "blocked_id": record["blocked_id"],
            "blocked_name": profile.get("full_name"),
            "blocked_avatar": profile.get("avatar_url"),
            "created_at": record["created_at"],
        })

    return blocked_list


# ---------------------------------------------------------------------------
# Conversation endpoints
# ---------------------------------------------------------------------------

@router.get("/conversations", response_model=list[ConversationResponse])
async def list_conversations(current_user: dict = Depends(get_current_user)):
    """
    List all conversations for the current user.
    Uses the get_user_conversations RPC for base data, then enriches with
    status/initiated_by from the conversations table. Skips rejected conversations.
    """
    user_id = current_user["id"]

    try:
        conv_result = supabase_admin.rpc(
            "get_user_conversations", {"p_user_id": user_id}
        ).execute()
        conversations = conv_result.data or []
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {e}")

    if not conversations:
        return []

    # Fetch status and initiated_by for all conversation IDs
    conv_ids = [c["conversation_id"] for c in conversations]
    conv_meta: dict[str, dict] = {}
    try:
        meta_result = (
            supabase_admin.table("conversations")
            .select("id, status, initiated_by")
            .in_("id", conv_ids)
            .execute()
        )
        for m in (meta_result.data or []):
            conv_meta[m["id"]] = m
    except Exception:
        pass  # Fall back to defaults if meta fetch fails

    enriched = []
    for conv in conversations:
        conv_id = conv["conversation_id"]
        meta = conv_meta.get(conv_id, {})
        status = meta.get("status", "accepted")

        # Skip rejected conversations
        if status == "rejected":
            continue

        other_user_id = conv.get("other_user_id")
        other_profile: dict = {}
        if other_user_id:
            try:
                p_result = (
                    supabase_admin.table("profiles")
                    .select("full_name, avatar_url")
                    .eq("id", other_user_id)
                    .single()
                    .execute()
                )
                other_profile = p_result.data or {}
            except Exception:
                pass

        enriched.append({
            "id": conv_id,
            "other_user_id": other_user_id or "",
            "other_user_name": other_profile.get("full_name"),
            "other_user_avatar": other_profile.get("avatar_url"),
            "listing_id": conv.get("listing_id"),
            "last_message_at": conv.get("last_message_at"),
            "last_message_text": conv.get("last_message_text"),
            "unread_count": int(conv.get("unread_count", 0)),
            "status": status,
            "initiated_by": meta.get("initiated_by"),
        })

    return enriched


@router.post("/conversations")
async def create_or_get_conversation(
    body: CreateConversationRequest,
    current_user: dict = Depends(get_current_user),
):
    """
    Start or get existing conversation with another user.
    New conversations start with status='pending'. Checks blocked_users first.
    If an initial_message is provided, it is sent as the first message.
    If previously rejected, re-sets to pending.
    """
    user_id = current_user["id"]
    other_user_id = body.other_user_id

    if user_id == other_user_id:
        raise HTTPException(status_code=400, detail="Cannot start a conversation with yourself")

    # Check if either user has blocked the other
    try:
        block_check = (
            supabase_admin.table("blocked_users")
            .select("id")
            .or_(
                f"and(blocker_id.eq.{user_id},blocked_id.eq.{other_user_id}),"
                f"and(blocker_id.eq.{other_user_id},blocked_id.eq.{user_id})"
            )
            .limit(1)
            .execute()
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {e}")

    if block_check.data:
        raise HTTPException(status_code=403, detail="Cannot message this user")

    # Check if conversation already exists
    listing_id = body.listing_id
    try:
        query = (
            supabase_admin.table("conversations")
            .select("id, status")
            .or_(
                f"and(user_a_id.eq.{user_id},user_b_id.eq.{other_user_id}),"
                f"and(user_a_id.eq.{other_user_id},user_b_id.eq.{user_id})"
            )
        )
        if listing_id:
            query = query.eq("listing_id", listing_id)
        else:
            query = query.is_("listing_id", "null")

        existing = query.limit(1).execute()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {e}")

    if existing.data:
        conv = existing.data[0]
        conv_id = conv["id"]

        # If previously rejected, re-set to pending
        if conv.get("status") == "rejected":
            try:
                supabase_admin.table("conversations").update({
                    "status": "pending",
                    "initiated_by": user_id,
                }).eq("id", conv_id).execute()
            except Exception:
                pass

            # Send message_request notification
            try:
                supabase_admin.table("notifications").insert({
                    "user_id": other_user_id,
                    "type": "message_request",
                    "title": "Message Request",
                    "body": f"{current_user.get('full_name', 'Someone')} wants to message you",
                    "metadata": {"conversation_id": conv_id},
                }).execute()
            except Exception:
                pass

        # Send initial message if provided
        if body.initial_message:
            try:
                supabase_admin.table("messages").insert({
                    "conversation_id": conv_id,
                    "sender_id": user_id,
                    "text": body.initial_message,
                }).execute()
            except Exception:
                pass

        return {"id": conv_id}

    # Create new conversation with status='pending'
    conv_data: dict = {
        "user_a_id": user_id,
        "user_b_id": other_user_id,
        "status": "pending",
        "initiated_by": user_id,
    }
    if listing_id:
        conv_data["listing_id"] = listing_id

    try:
        result = (
            supabase_admin.table("conversations")
            .insert(conv_data)
            .select("id")
            .single()
            .execute()
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create conversation: {e}")

    conv_id = result.data["id"]

    # Send initial message if provided
    if body.initial_message:
        try:
            supabase_admin.table("messages").insert({
                "conversation_id": conv_id,
                "sender_id": user_id,
                "text": body.initial_message,
            }).execute()
        except Exception:
            pass

    # Send message_request notification to the other user
    try:
        supabase_admin.table("notifications").insert({
            "user_id": other_user_id,
            "type": "message_request",
            "title": "Message Request",
            "body": f"{current_user.get('full_name', 'Someone')} wants to message you",
            "metadata": {"conversation_id": conv_id},
        }).execute()
    except Exception:
        pass

    return {"id": conv_id}


# ---------------------------------------------------------------------------
# Conversation action endpoints (must come before /{conversation_id} catch-all)
# ---------------------------------------------------------------------------

@router.post("/conversations/{conversation_id}/accept")
async def accept_conversation(
    conversation_id: str,
    current_user: dict = Depends(get_current_user),
):
    """Accept a pending conversation. Only the non-initiator can accept."""
    user_id = current_user["id"]
    conv = _fetch_conversation(conversation_id)
    _verify_participation(conv, user_id)

    # Only the non-initiator can accept
    if conv.get("initiated_by") == user_id:
        raise HTTPException(status_code=403, detail="Only the recipient can accept a message request")

    if conv.get("status") == "accepted":
        return {"detail": "Conversation already accepted"}

    if conv.get("status") == "rejected":
        raise HTTPException(status_code=400, detail="Cannot accept a rejected conversation")

    try:
        supabase_admin.table("conversations").update(
            {"status": "accepted"}
        ).eq("id", conversation_id).execute()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {e}")

    # Notify the initiator that their request was accepted
    initiator_id = conv.get("initiated_by")
    if initiator_id:
        try:
            supabase_admin.table("notifications").insert({
                "user_id": initiator_id,
                "type": "message_request_accepted",
                "title": "Message Request Accepted",
                "body": f"{current_user.get('full_name', 'Someone')} accepted your message request",
                "metadata": {"conversation_id": conversation_id},
            }).execute()
        except Exception:
            pass

    return {"detail": "Conversation accepted"}


@router.post("/conversations/{conversation_id}/reject")
async def reject_conversation(
    conversation_id: str,
    current_user: dict = Depends(get_current_user),
):
    """Reject a pending conversation. Only the non-initiator can reject."""
    user_id = current_user["id"]
    conv = _fetch_conversation(conversation_id)
    _verify_participation(conv, user_id)

    # Only the non-initiator can reject
    if conv.get("initiated_by") == user_id:
        raise HTTPException(status_code=403, detail="Only the recipient can reject a message request")

    if conv.get("status") == "rejected":
        return {"detail": "Conversation already rejected"}

    try:
        supabase_admin.table("conversations").update(
            {"status": "rejected"}
        ).eq("id", conversation_id).execute()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {e}")

    return {"detail": "Conversation rejected"}


# ---------------------------------------------------------------------------
# Message endpoints (catch-all patterns — must be last)
# ---------------------------------------------------------------------------

@router.get("/conversations/{conversation_id}", response_model=list[MessageResponse])
async def get_messages(
    conversation_id: str,
    current_user: dict = Depends(get_current_user),
):
    """Get all messages in a conversation. User must be a participant."""
    user_id = current_user["id"]
    conv = _fetch_conversation(conversation_id)
    _verify_participation(conv, user_id)

    try:
        result = (
            supabase_admin.table("messages")
            .select("*")
            .eq("conversation_id", conversation_id)
            .order("created_at", desc=False)
            .execute()
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {e}")

    return result.data or []


@router.post("/conversations/{conversation_id}", response_model=MessageResponse)
async def send_message(
    conversation_id: str,
    body: SendMessageRequest,
    current_user: dict = Depends(get_current_user),
):
    """
    Send a message in a conversation. User must be a participant.
    - If status='rejected' → 403
    - If status='pending' and sender is initiator → 403 (wait for acceptance)
    - If status='pending' and sender is receiver → auto-accept the conversation
    """
    user_id = current_user["id"]
    conv = _fetch_conversation(conversation_id)
    _verify_participation(conv, user_id)

    status = conv.get("status", "accepted")
    initiated_by = conv.get("initiated_by")

    # Block messaging in rejected conversations
    if status == "rejected":
        raise HTTPException(status_code=403, detail="This conversation has been rejected")

    # Handle pending conversation rules
    if status == "pending":
        if initiated_by == user_id:
            # Initiator cannot send more messages until accepted
            raise HTTPException(
                status_code=403,
                detail="Waiting for the other user to accept your message request",
            )
        else:
            # Receiver replying → auto-accept
            try:
                supabase_admin.table("conversations").update(
                    {"status": "accepted"}
                ).eq("id", conversation_id).execute()
            except Exception:
                pass

            # Notify initiator of acceptance
            if initiated_by:
                try:
                    supabase_admin.table("notifications").insert({
                        "user_id": initiated_by,
                        "type": "message_request_accepted",
                        "title": "Message Request Accepted",
                        "body": f"{current_user.get('full_name', 'Someone')} accepted your message request",
                        "metadata": {"conversation_id": conversation_id},
                    }).execute()
                except Exception:
                    pass

    # Build and insert the message
    message_data: dict = {
        "conversation_id": conversation_id,
        "sender_id": user_id,
        "text": body.text,
    }
    if body.attachment_url:
        message_data["attachment_url"] = body.attachment_url
    if body.attachment_name:
        message_data["attachment_name"] = body.attachment_name
    if body.attachment_size:
        message_data["attachment_size"] = body.attachment_size

    try:
        result = (
            supabase_admin.table("messages")
            .insert(message_data)
            .select("*")
            .single()
            .execute()
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to send message: {e}")

    # Notify the other participant
    other_user_id = _get_other_user_id(conv, user_id)
    try:
        supabase_admin.table("notifications").insert({
            "user_id": other_user_id,
            "type": "new_message",
            "title": "New Message",
            "body": f"{current_user.get('full_name', 'Someone')} sent you a message",
            "metadata": {"conversation_id": conversation_id},
        }).execute()
    except Exception:
        pass

    return result.data
