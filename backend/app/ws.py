"""
WebSocket room manager for live coding sessions.

Each session_link gets its own room. The server stores the last code_update
so late-joining participants (e.g. the interviewer who connects after the
interviewee has already started typing) receive the current state immediately.
"""

from fastapi import WebSocket, WebSocketDisconnect, APIRouter
from typing import Dict, List, Optional

router = APIRouter()


class SessionRoom:
    def __init__(self):
        self.connections: List[WebSocket] = []
        self.last_code_state: Optional[dict] = None   # last code_update broadcast

    async def connect(self, ws: WebSocket):
        await ws.accept()
        self.connections.append(ws)
        # Send current editor state to the new joiner so they're in sync
        if self.last_code_state:
            try:
                await ws.send_json(self.last_code_state)
            except Exception:
                pass

    def disconnect(self, ws: WebSocket):
        if ws in self.connections:
            self.connections.remove(ws)

    async def broadcast(self, message: dict, sender: WebSocket):
        if message.get("type") == "code_update":
            self.last_code_state = message
        for ws in self.connections:
            if ws is not sender:
                try:
                    await ws.send_json(message)
                except Exception:
                    pass


_rooms: Dict[str, SessionRoom] = {}


@router.websocket("/ws/session/{session_link}")
async def session_ws(websocket: WebSocket, session_link: str):
    if session_link not in _rooms:
        _rooms[session_link] = SessionRoom()
    room = _rooms[session_link]
    await room.connect(websocket)
    try:
        while True:
            data = await websocket.receive_json()
            await room.broadcast(data, websocket)
    except WebSocketDisconnect:
        room.disconnect(websocket)
        if not room.connections:
            _rooms.pop(session_link, None)
