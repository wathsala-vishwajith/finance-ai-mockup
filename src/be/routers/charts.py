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
    LineChartPoint,
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

# Store line chart point index for each connection (for smooth animation)
line_chart_counters: Dict[WebSocket, int] = {}

# Store connection start times for time-based X-axis
connection_start_times: Dict[WebSocket, datetime] = {}

# Default chart labels and colors
PIE_CHART_LABELS = ["Technology", "Healthcare", "Finance", "Energy", "Consumer"]
PIE_CHART_COLORS = ["#FF6384", "#36A2EB", "#FFCE56", "#4BC0C0", "#9966FF"]

BAR_CHART_LABELS = ["Q1", "Q2", "Q3", "Q4", "Q5"]
BAR_CHART_COLORS = ["#FF6384", "#36A2EB", "#FFCE56", "#4BC0C0", "#9966FF"]


async def authenticate_websocket(websocket: WebSocket, token: str) -> bool:
    """Authenticate WebSocket connection using JWT token"""
    if not token:
        print("WebSocket auth failed: No token provided")
        return False
    
    try:
        payload = verify_token(token, "access")
        if not payload:
            print("WebSocket auth failed: Invalid token")
            return False
        
        print(f"WebSocket auth successful for user: {payload.get('username')}")
        return True
    except Exception as e:
        print(f"WebSocket auth error: {e}")
        return False


def generate_line_chart_point(websocket: WebSocket) -> LineChartPoint:
    """Generate a single time-based data point for line chart"""
    current_time = datetime.utcnow()
    
    # Initialize connection data if this is the first point
    if websocket not in connection_start_times:
        connection_start_times[websocket] = current_time
        line_chart_counters[websocket] = 0
    
    # Get the interval for this connection (default 2000ms)
    interval_ms = connection_intervals.get(websocket, 2000)
    
    # Calculate time index based on elapsed time and interval
    start_time = connection_start_times[websocket]
    elapsed_ms = (current_time - start_time).total_seconds() * 1000
    time_index = int(elapsed_ms / interval_ms)
    
    # Update counter to match calculated time index
    line_chart_counters[websocket] = time_index
    
    # Generate simple positive random values for Y-axis
    # Use time-based seed for slight consistency but with randomness
    import random
    import math
    
    # Create a smooth base trend with time progression
    time_factor = time_index * 0.1
    base_trend = 50 + math.sin(time_factor * 0.05) * 20  # Slow sine wave trend
    
    # Add some controlled randomness
    random_variation = random.uniform(-15, 15)
    
    # Combine for final value
    value = base_trend + random_variation
    
    # Ensure value stays positive and within reasonable bounds
    value = max(5, min(95, value))
    
    return LineChartPoint(
        timestamp=current_time,
        value=round(value, 2),
        index=time_index
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
            data = generate_line_chart_point(websocket)
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
        # Clean up connection data
        chart_connections[chart_type].discard(websocket)
        connection_intervals.pop(websocket, None)
        # Clean up line chart counter and start time for this connection
        line_chart_counters.pop(websocket, None)
        connection_start_times.pop(websocket, None)


@router.websocket("/ws/{chart_type}")
async def websocket_chart_endpoint(
    websocket: WebSocket,
    chart_type: str,
    token: str = Query(None, description="JWT access token")
):
    """WebSocket endpoint for chart data streaming"""
    
    # Validate chart type
    if chart_type not in ["line", "pie", "bar"]:
        print(f"Invalid chart type: {chart_type}")
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return
    
    print(f"Accepting WebSocket connection for chart type: {chart_type}")
    await websocket.accept()
    
    # Authenticate the connection AFTER accepting
    print(f"Authenticating WebSocket connection for chart type: {chart_type}")
    if not await authenticate_websocket(websocket, token):
        print(f"Authentication failed for token: {token[:20]}..." if token else "No token")
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return
    
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
        
        # Clean up connection data
        chart_connections[chart_type].discard(websocket)
        connection_intervals.pop(websocket, None)
        # Clean up line chart counter and start time for this connection  
        line_chart_counters.pop(websocket, None)
        connection_start_times.pop(websocket, None)


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