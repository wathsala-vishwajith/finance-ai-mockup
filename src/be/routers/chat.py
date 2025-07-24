import asyncio
import json
import random
from datetime import datetime
from typing import Set
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query, status
from fastapi.websockets import WebSocketState
from sqlmodel import Session, select

from be.core.database import get_session
from be.core.security import verify_token
from be.models import User
from be.schemas import ChatMessageIn, ChatMessageOut

router = APIRouter(prefix="/chat", tags=["chat"])

# Store active WebSocket connections
chat_connections: Set[WebSocket] = set()

# Sample lorem ipsum words for generating responses
LOREM_WORDS = [
    "lorem", "ipsum", "dolor", "sit", "amet", "consectetur", "adipiscing", "elit",
    "sed", "do", "eiusmod", "tempor", "incididunt", "ut", "labore", "et", "dolore",
    "magna", "aliqua", "enim", "ad", "minim", "veniam", "quis", "nostrud",
    "exercitation", "ullamco", "laboris", "nisi", "aliquip", "ex", "ea", "commodo",
    "consequat", "duis", "aute", "irure", "in", "reprehenderit", "voluptate",
    "velit", "esse", "cillum", "fugiat", "nulla", "pariatur", "excepteur", "sint",
    "occaecat", "cupidatat", "non", "proident", "sunt", "culpa", "qui", "officia",
    "deserunt", "mollit", "anim", "id", "est", "laborum", "at", "vero", "eos",
    "accusamus", "accusantium", "doloremque", "laudantium", "totam", "rem",
    "aperiam", "eaque", "ipsa", "quae", "ab", "illo", "inventore", "veritatis",
    "et", "quasi", "architecto", "beatae", "vitae", "dicta", "sunt", "explicabo",
    "nemo", "ipsam", "voluptatem", "quia", "voluptas", "aspernatur", "aut",
    "odit", "aut", "fugit", "consequuntur", "magni", "dolores", "ratione",
    "sequi", "nesciunt", "neque", "porro", "quisquam", "qui", "dolorem"
]


async def authenticate_websocket_and_get_user(websocket: WebSocket, token: str) -> User | None:
    """Authenticate WebSocket connection and return user object"""
    if not token:
        print("WebSocket auth failed: No token provided")
        return None
    
    try:
        payload = verify_token(token, "access")
        if not payload:
            print("WebSocket auth failed: Invalid token")
            return None
        
        user_id = payload.get("sub")
        if not user_id:
            print("WebSocket auth failed: No user ID in token")
            return None
        
        # Get user from database
        with next(get_session()) as session:
            user = session.exec(select(User).where(User.id == int(user_id))).first()
            if not user or not user.is_active:
                print("WebSocket auth failed: User not found or inactive")
                return None
        
        print(f"WebSocket auth successful for user: {user.username} (ID: {user.id})")
        return user
    except Exception as e:
        print(f"WebSocket auth error: {e}")
        return None


def generate_lorem_response(user_full_name: str, user_message: str) -> str:
    """Generate a lorem ipsum response in the specified format"""
    # Generate random lorem ipsum text (50-200 words)
    word_count = random.randint(50, 200)
    lorem_text = " ".join(random.choices(LOREM_WORDS, k=word_count))
    
    # Format the response
    response = f"Excellent question {user_full_name}, {user_message}, {lorem_text}"
    
    return response


@router.websocket("/ws")
async def websocket_chat_endpoint(
    websocket: WebSocket,
    token: str = Query(None, description="JWT access token")
):
    """WebSocket endpoint for chat functionality"""
    
    print("Accepting WebSocket connection for chat...")
    await websocket.accept()
    
    # Authenticate the connection and get user
    user = await authenticate_websocket_and_get_user(websocket, token)
    if not user:
        print(f"Authentication failed for token: {token[:20]}..." if token else "No token")
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return
    
    # Add connection to active connections
    chat_connections.add(websocket)
    
    try:
        while True:
            # Listen for client messages
            data = await websocket.receive_text()
            try:
                message_data = json.loads(data)
                
                # Validate message format
                if "message" not in message_data:
                    await websocket.send_text(json.dumps({
                        "error": "Message field is required"
                    }))
                    continue
                
                user_message = message_data["message"].strip()
                if not user_message:
                    await websocket.send_text(json.dumps({
                        "error": "Message cannot be empty"
                    }))
                    continue
                
                # Create user message response
                user_msg_out = ChatMessageOut(
                    message=user_message,
                    sender="user",
                    timestamp=datetime.utcnow(),
                    is_complete=True
                )
                
                # Send user message back (for consistency)
                await websocket.send_text(user_msg_out.model_dump_json())
                
                # Generate AI response
                user_display_name = user.full_name or user.username
                ai_response = generate_lorem_response(user_display_name, user_message)
                
                # Send AI response with typing simulation
                await send_typing_response(websocket, ai_response)
                
            except json.JSONDecodeError:
                await websocket.send_text(json.dumps({
                    "error": "Invalid JSON message"
                }))
                
    except WebSocketDisconnect:
        print(f"WebSocket disconnected for user: {user.username}")
    except Exception as e:
        print(f"WebSocket error for user {user.username}: {e}")
    finally:
        # Clean up connection
        chat_connections.discard(websocket)


async def send_typing_response(websocket: WebSocket, full_response: str):
    """Send response with typing effect - words appear gradually"""
    words = full_response.split()
    current_message = ""
    
    for i, word in enumerate(words):
        current_message += word
        if i < len(words) - 1:
            current_message += " "
        
        # Send partial message
        partial_msg = ChatMessageOut(
            message=current_message,
            sender="assistant", 
            timestamp=datetime.utcnow(),
            is_complete=(i == len(words) - 1)
        )
        
        await websocket.send_text(partial_msg.model_dump_json())
        
        # Add delay between words for typing effect
        if i < len(words) - 1:  # Don't delay after the last word
            # Vary delay slightly for more natural feel
            delay = random.uniform(0.05, 0.15)  # 50-150ms between words
            await asyncio.sleep(delay)


@router.get("/status")
async def get_chat_status():
    """Get chat service status"""
    return {
        "status": "active",
        "active_connections": len(chat_connections),
        "websocket_endpoint": "/chat/ws",
        "authentication": "JWT token required via query parameter 'token'",
        "response_format": "excellent question {user_full_name}, {user_message}, lorem ipsum...",
        "response_word_count": "50-200 words"
    } 