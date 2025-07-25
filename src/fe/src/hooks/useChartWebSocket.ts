import { useEffect, useRef, useState, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';

export interface ChartDataPoint {
  timestamp: string;
  value: number;
  label?: string;
}

export interface LineChartData {
  timestamp: string;
  data_points: number[];
}

export interface LineChartPoint {
  timestamp: string;
  value: number;
  index: number;
}

export interface AccumulatedLineData {
  data: Array<{ x: number; value: number; timestamp: string }>;
  latestPoint: LineChartPoint | null;
}

export interface PieChartSlice {
  label: string;
  value: number;
  color?: string;
}

export interface PieChartData {
  timestamp: string;
  slices: PieChartSlice[];
}

export interface BarChartBar {
  label: string;
  value: number;
  color?: string;
}

export interface BarChartData {
  timestamp: string;
  bars: BarChartBar[];
}

export type ChartData = AccumulatedLineData | PieChartData | BarChartData;

interface UseChartWebSocketProps {
  chartType: 'line' | 'pie' | 'bar';
  intervalMs?: number;
  enabled?: boolean;
}

interface UseChartWebSocketReturn {
  data: ChartData | null;
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
  setInterval: (intervalMs: number) => void;
  reconnect: () => void;
}

export const useChartWebSocket = ({
  chartType,
  intervalMs = 2000,
  enabled = true,
}: UseChartWebSocketProps): UseChartWebSocketReturn => {
  const { accessToken, refreshAccessToken } = useAuth();
  const wsRef = useRef<WebSocket | null>(null);
  const [data, setData] = useState<ChartData | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentInterval, setCurrentInterval] = useState(intervalMs);
  const reconnectTimeoutRef = useRef<number | null>(null);
  const lastTokenRef = useRef<string | null>(null);
  const retryCountRef = useRef(0);

  // For line charts, maintain a buffer of points with FIFO behavior
  const lineDataBufferRef = useRef<Array<{ x: number; value: number; timestamp: string }>>([]);
  const maxBufferSize = 30; // Keep last 30 points for smooth animation

  // Cleanup function
  const cleanup = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    if (wsRef.current) {
      console.log('Manually closing WebSocket connection');
      wsRef.current.close(1000, 'Manual disconnect');
      wsRef.current = null;
    }
    setIsConnected(false);
    setIsConnecting(false);
    // Reset line chart buffer when disconnecting
    if (chartType === 'line') {
      lineDataBufferRef.current = [];
    }
  }, [chartType]);

  // Handle incoming chart data with accumulation for line charts
  const handleChartData = useCallback((parsedData: any) => {
    if (chartType === 'line') {
      // Handle single point data for line charts
      const point = parsedData as LineChartPoint;
      
      // Add new point to buffer
      const newPoint = {
        x: point.index,
        value: point.value,
        timestamp: point.timestamp
      };
      
      lineDataBufferRef.current.push(newPoint);
      
      // Implement FIFO - remove old points if buffer is too large
      if (lineDataBufferRef.current.length > maxBufferSize) {
        lineDataBufferRef.current = lineDataBufferRef.current.slice(-maxBufferSize);
      }
      
      // Update data with accumulated points
      setData({
        data: [...lineDataBufferRef.current],
        latestPoint: point
      } as AccumulatedLineData);
      
    } else {
      // Handle other chart types normally
      setData(parsedData);
    }
  }, [chartType, maxBufferSize]);

  // Create connection
  const connect = useCallback(async (forceTokenRefresh = false) => {
    if (!enabled || isConnecting || isConnected) {
      console.log('Skipping connection attempt:', { enabled, isConnecting, isConnected });
      return;
    }

    // Get current token, potentially refreshing it if needed
    let tokenToUse = accessToken;
    
    if (forceTokenRefresh || !tokenToUse) {
      console.log('Attempting to refresh token for WebSocket...');
      try {
        const newToken = await refreshAccessToken();
        tokenToUse = newToken;
        console.log('Token refresh successful for WebSocket');
      } catch (error) {
        console.error('Failed to refresh token for WebSocket:', error);
        setError('Authentication failed');
        return;
      }
    }

    if (!tokenToUse) {
      console.log('No valid token available for WebSocket');
      setError('No authentication token available');
      return;
    }

    console.log(`Starting WebSocket connection to ${chartType} chart...`);
    setIsConnecting(true);
    setError(null);

    try {
      const wsUrl = `ws://localhost:8000/charts/ws/${chartType}?token=${encodeURIComponent(tokenToUse)}`;
      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        console.log(`✅ WebSocket connected successfully to ${chartType} chart`);
        setIsConnected(true);
        setIsConnecting(false);
        setError(null);
        lastTokenRef.current = tokenToUse;
        retryCountRef.current = 0;
        
        // Send initial interval configuration
        console.log('Sending initial interval configuration:', currentInterval);
        ws.send(JSON.stringify({ interval_ms: currentInterval }));
      };

      ws.onmessage = (event) => {
        try {
          const parsedData = JSON.parse(event.data);
          
          if (parsedData.error) {
            console.error('WebSocket error from server:', parsedData.error);
            
            // Check if it's an auth error
            if (parsedData.error.includes('Invalid token') || 
                parsedData.error.includes('expired') ||
                parsedData.error.includes('Authentication failed')) {
              console.log('WebSocket auth error detected, will retry with token refresh');
              setError('Authentication expired, refreshing...');
              cleanup();
              // Retry with token refresh after a short delay
              setTimeout(() => connect(true), 1000);
              return;
            }
            
            setError(parsedData.error);
            return;
          }
          
          if (parsedData.status) {
            console.log('WebSocket status update:', parsedData);
            return;
          }
          
          // Update chart data
          handleChartData(parsedData);
        } catch (err) {
          console.error('Error parsing WebSocket message:', err);
          setError('Error parsing chart data');
        }
      };

      ws.onerror = (event) => {
        console.error('WebSocket error event:', event);
        setError('WebSocket connection error');
        setIsConnecting(false);
      };

      ws.onclose = (event) => {
        console.log('🔌 WebSocket closed:', { 
          code: event.code, 
          reason: event.reason, 
          wasClean: event.wasClean,
          chartType 
        });
        
        setIsConnected(false);
        setIsConnecting(false);

        // Check if this is an auth-related closure
        const isAuthFailure = event.code === 1008 || // Policy violation (often auth)
                             event.code === 4001 || // Custom auth error
                             event.code === 3000 || // Custom auth error  
                             (event.reason && (
                               event.reason.includes('Invalid token') ||
                               event.reason.includes('expired') ||
                               event.reason.includes('Authentication failed')
                             ));

        if (isAuthFailure && retryCountRef.current < 2) {
          retryCountRef.current += 1;
          console.log(`WebSocket auth failure detected (attempt ${retryCountRef.current}/2), refreshing token...`);
          setError(`Authentication expired, refreshing... (${retryCountRef.current}/2)`);
          
          // Retry with token refresh after a delay
          reconnectTimeoutRef.current = setTimeout(() => {
            console.log('Retrying WebSocket connection with token refresh...');
            connect(true);
          }, 2000);
          return;
        }

        // Only attempt reconnection for unexpected closures (non-auth)
        if (event.code !== 1000 && enabled && retryCountRef.current < 3 && !isAuthFailure) {
          retryCountRef.current += 1;
          const delay = Math.min(1000 * Math.pow(2, retryCountRef.current - 1), 10000);
          
          console.log(`Reconnecting in ${delay}ms (attempt ${retryCountRef.current}/3)...`);
          setError(`Connection lost, reconnecting in ${Math.round(delay/1000)}s...`);
          
          reconnectTimeoutRef.current = setTimeout(() => {
            console.log('Attempting to reconnect...');
            connect(false);
          }, delay);
        } else if (event.code !== 1000) {
          if (isAuthFailure) {
            setError('Authentication failed. Please refresh the page.');
          } else {
            setError('Connection lost');
          }
        }
      };

      wsRef.current = ws;
    } catch (err) {
      console.error('Error creating WebSocket:', err);
      setError('Failed to create WebSocket connection');
      setIsConnecting(false);
    }
  }, [chartType, accessToken, enabled, isConnecting, isConnected, currentInterval, handleChartData, refreshAccessToken, cleanup]);

  // Set interval function
  const setInterval = useCallback((newIntervalMs: number) => {
    setCurrentInterval(newIntervalMs);
    
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      console.log('Updating WebSocket interval to:', newIntervalMs);
      wsRef.current.send(JSON.stringify({ interval_ms: newIntervalMs }));
    }
  }, []);

  // Manual reconnect
  const reconnect = useCallback(() => {
    console.log('Manual reconnect requested');
    cleanup();
    retryCountRef.current = 0;
    setTimeout(() => connect(false), 1000);
  }, [cleanup, connect]);

  // Main connection effect - only responds to essential changes
  useEffect(() => {
    if (enabled && accessToken) {
      console.log('WebSocket effect triggered:', { enabled, hasToken: !!accessToken, chartType });
      connect(false);
    } else {
      console.log('WebSocket disabled or no token, cleaning up');
      cleanup();
    }

    return cleanup;
  }, [enabled, accessToken, chartType]); // Minimal dependencies

  // Handle interval changes
  useEffect(() => {
    setCurrentInterval(intervalMs);
  }, [intervalMs]);

  // Handle token changes for existing connections
  useEffect(() => {
    if (isConnected && accessToken && accessToken !== lastTokenRef.current) {
      console.log('Token changed, reconnecting...');
      cleanup();
      setTimeout(() => connect(false), 500);
    }
  }, [accessToken, isConnected, cleanup, connect]);

  // Cleanup on unmount
  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  return {
    data,
    isConnected,
    isConnecting,
    error,
    setInterval,
    reconnect,
  };
}; 