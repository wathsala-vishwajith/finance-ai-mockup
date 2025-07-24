import asyncio
import json
import random
from datetime import datetime
from typing import Dict, Set
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query, HTTPException, status
from fastapi.websockets import WebSocketState
from sqlmodel import Session

from be.core.database import get_session
from be.core.security import verify_token
from be.schemas import (
    ChartSubscribe,
    LineChartData,
    PieChartData,
    PieChartSlice,
    BarChartData,
    BarChartBar
)

router = APIRouter(prefix="/charts", tags=["charts"])

# Store active WebSocket connections for each chart type
chart_connections: Dict[str, Set[WebSocket]] = {
    "line": set(),
    "pie": set(),
    "bar": set()
}

# Store intervals for each connection
connection_intervals: Dict[WebSocket, int] = {}

# Default chart labels and colors
PIE_CHART_LABELS = ["Technology", "Healthcare", "Finance", "Energy", "Consumer"]
PIE_CHART_COLORS = ["#FF6384", "#36A2EB", "#FFCE56", "#4BC0C0", "#9966FF"]

BAR_CHART_LABELS = ["Q1", "Q2", "Q3", "Q4", "Q5"]
BAR_CHART_COLORS = ["#FF6384", "#36A2EB", "#FFCE56", "#4BC0C0", "#9966FF"]


async def authenticate_websocket(websocket: WebSocket, token: str) -> bool:
    """Authenticate WebSocket connection using JWT token"""
    if not token:
        return False
    
    payload = verify_token(token, "access")
    if not payload:
        return False
    
    # Store user info in websocket state for potential future use
    websocket.state.user_id = payload.get("sub")
    websocket.state.username = payload.get("username")
    return True


def generate_line_chart_data() -> LineChartData:
    """Generate random data for line chart (5 data points)"""
    data_points = [random.uniform(10, 100) for _ in range(5)]
    return LineChartData(
        timestamp=datetime.utcnow(),
        data_points=data_points
    )


def generate_pie_chart_data() -> PieChartData:
    """Generate random data for pie chart"""
    slices = []
    total = 100
    remaining = total
    
    for i, label in enumerate(PIE_CHART_LABELS[:-1]):
        # Generate value between 5 and remaining/2 to ensure all slices get some value
        max_value = min(remaining - (len(PIE_CHART_LABELS) - i - 1) * 5, remaining * 0.6)
        value = random.uniform(5, max_value)
        remaining -= value
        
        slices.append(PieChartSlice(
            label=label,
            value=round(value, 2),
            color=PIE_CHART_COLORS[i]
        ))
    
    # Last slice gets remaining value
    slices.append(PieChartSlice(
        label=PIE_CHART_LABELS[-1],
        value=round(remaining, 2),
        color=PIE_CHART_COLORS[-1]
    ))
    
    return PieChartData(
        timestamp=datetime.utcnow(),
        slices=slices
    )


def generate_bar_chart_data() -> BarChartData:
    """Generate random data for bar chart"""
    bars = []
    
    for i, label in enumerate(BAR_CHART_LABELS):
        bars.append(BarChartBar(
            label=label,
            value=round(random.uniform(20, 80), 2),
            color=BAR_CHART_COLORS[i]
        ))
    
    return BarChartData(
        timestamp=datetime.utcnow(),
        bars=bars
    )


async def send_chart_data(websocket: WebSocket, chart_type: str):
    """Send chart data based on chart type"""
    try:
        if chart_type == "line":
            data = generate_line_chart_data()
        elif chart_type == "pie":
            data = generate_pie_chart_data()
        elif chart_type == "bar":
            data = generate_bar_chart_data()
        else:
            return
        
        await websocket.send_text(data.model_dump_json())
    except Exception as e:
        print(f"Error sending chart data: {e}")


async def connection_data_sender(websocket: WebSocket, chart_type: str):
    """Background task to send chart data to a specific WebSocket connection"""
    try:
        while websocket.client_state == WebSocketState.CONNECTED:
            await send_chart_data(websocket, chart_type)
            
            # Get interval for this connection (default 2000ms)
            interval_ms = connection_intervals.get(websocket, 2000)
            await asyncio.sleep(interval_ms / 1000.0)
            
    except Exception as e:
        print(f"Error in data sender for websocket: {e}")
    finally:
        # Clean up connection
        chart_connections[chart_type].discard(websocket)
        connection_intervals.pop(websocket, None)


@router.websocket("/ws/{chart_type}")
async def websocket_chart_endpoint(
    websocket: WebSocket,
    chart_type: str,
    token: str = Query(None, description="JWT access token")
):
    """WebSocket endpoint for chart data streaming"""
    
    # Validate chart type
    if chart_type not in ["line", "pie", "bar"]:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return
    
    # Authenticate the connection
    if not await authenticate_websocket(websocket, token):
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return
    
    await websocket.accept()
    
    # Add connection to active connections
    chart_connections[chart_type].add(websocket)
    
    # Set default interval
    connection_intervals[websocket] = 2000
    
    # Start background task to send data to this connection
    data_sender_task = asyncio.create_task(connection_data_sender(websocket, chart_type))
    
    try:        
        while True:
            # Listen for client messages (interval updates)
            data = await websocket.receive_text()
            try:
                message = json.loads(data)
                
                # Handle interval update
                if "interval_ms" in message:
                    interval_ms = message["interval_ms"]
                    
                    # Validate interval (500ms to 60000ms)
                    if 500 <= interval_ms <= 60000:
                        connection_intervals[websocket] = interval_ms
                        await websocket.send_text(json.dumps({
                            "status": "interval_updated",
                            "interval_ms": interval_ms
                        }))
                    else:
                        await websocket.send_text(json.dumps({
                            "error": "Invalid interval. Must be between 500ms and 60000ms"
                        }))
                
            except json.JSONDecodeError:
                await websocket.send_text(json.dumps({
                    "error": "Invalid JSON message"
                }))
                
    except WebSocketDisconnect:
        pass
    except Exception as e:
        print(f"WebSocket error: {e}")
    finally:
        # Cancel the data sender task
        data_sender_task.cancel()
        try:
            await data_sender_task
        except asyncio.CancelledError:
            pass
        
        # Clean up connection
        chart_connections[chart_type].discard(websocket)
        connection_intervals.pop(websocket, None)


@router.get("/types")
async def get_supported_chart_types():
    """Get list of supported chart types"""
    return {
        "chart_types": ["line", "pie", "bar"],
        "websocket_endpoint": "/charts/ws/{chart_type}",
        "authentication": "JWT token required via query parameter 'token'",
        "default_interval_ms": 2000,
        "interval_range": "500ms - 60000ms"
    } 