import asyncio
import json
import time
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import List
import os

from nfc_reader import NFCReader

app = FastAPI()

# WebSockets connections storage
class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

    async def broadcast(self, message: dict):
        for connection in self.active_connections:
            try:
                await connection.send_json(message)
            except Exception as e:
                print(f"Error broadcasting to connection: {e}")

manager = ConnectionManager()

# NFC Reader Callback
def on_nfc_scan(uid: str):
    # This is called from a background thread
    message = {
        "type": "nfc_scan",
        "uid": uid,
        "timestamp": time.strftime("%H:%M:%S")
    }
    if loop and loop.is_running():
        asyncio.run_coroutine_threadsafe(manager.broadcast(message), loop)

# Simulation endpoint
class SimulationPayload(BaseModel):
    uid: str = "SIM-12345"

@app.post("/api/simulate-nfc")
async def simulate_nfc(payload: SimulationPayload):
    message = {
        "type": "nfc_scan",
        "uid": payload.uid,
        "timestamp": time.strftime("%H:%M:%S")
    }
    await manager.broadcast(message)
    return {"status": "ok", "simulated": payload.uid}

@app.websocket("/ws/nfc")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            # Keep connection alive
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception as e:
        print(f"WebSocket error: {e}")
        manager.disconnect(websocket)

# Lifecycle management
nfc_thread = None
loop = None

@app.on_event("startup")
async def startup_event():
    global nfc_thread, loop
    loop = asyncio.get_event_loop()
    nfc_thread = NFCReader(on_nfc_scan)
    nfc_thread.start()

@app.on_event("shutdown")
def shutdown_event():
    if nfc_thread:
        nfc_thread.stop()

# Serve static files from the 'static' directory
static_dir = os.path.join(os.path.dirname(__file__), "static")
if not os.path.exists(static_dir):
    os.makedirs(static_dir, exist_ok=True)

app.mount("/", StaticFiles(directory=static_dir, html=True), name="static")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
