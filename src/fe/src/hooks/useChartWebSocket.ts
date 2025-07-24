import { useEffect, useRef, useState, useCallback } from 'react';

export interface ChartDataPoint {
  timestamp: string;
  value: number;
  label?: string;
}

export interface LineChartData {
  timestamp: string;
  data_points: number[];
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

export type ChartData = LineChartData | PieChartData | BarChartData;

interface UseChartWebSocketProps {
  chartType: 'line' | 'pie' | 'bar';
  token: string;
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
  token,
  intervalMs = 2000,
  enabled = true,
}: UseChartWebSocketProps): UseChartWebSocketReturn => {
  const wsRef = useRef<WebSocket | null>(null);
  const [data, setData] = useState<ChartData | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentInterval, setCurrentInterval] = useState(intervalMs);

  const connect = useCallback(() => {
    if (!enabled || !token || isConnecting) return;

    setIsConnecting(true);
    setError(null);

    try {
      const wsUrl = `ws://localhost:8000/charts/ws/${chartType}?token=${encodeURIComponent(token)}`;
      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        console.log(`WebSocket connected to ${chartType} chart`);
        setIsConnected(true);
        setIsConnecting(false);
        setError(null);
        
        // Send initial interval configuration
        ws.send(JSON.stringify({ interval_ms: currentInterval }));
      };

      ws.onmessage = (event) => {
        try {
          const parsedData = JSON.parse(event.data);
          
          // Handle error messages
          if (parsedData.error) {
            setError(parsedData.error);
            return;
          }
          
          // Handle status messages (like interval updates)
          if (parsedData.status) {
            console.log('WebSocket status:', parsedData);
            return;
          }
          
          // Handle chart data
          setData(parsedData);
        } catch (err) {
          console.error('Error parsing WebSocket message:', err);
          setError('Error parsing chart data');
        }
      };

      ws.onerror = (event) => {
        console.error('WebSocket error:', event);
        setError('WebSocket connection error');
        setIsConnecting(false);
      };

      ws.onclose = (event) => {
        console.log('WebSocket closed:', event.code, event.reason);
        setIsConnected(false);
        setIsConnecting(false);
        
        if (event.code !== 1000) { // Not a normal closure
          setError(`Connection closed: ${event.reason || 'Unknown reason'}`);
        }
      };

      wsRef.current = ws;
    } catch (err) {
      console.error('Error creating WebSocket:', err);
      setError('Failed to create WebSocket connection');
      setIsConnecting(false);
    }
  }, [chartType, token, enabled, isConnecting, currentInterval]);

  const disconnect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close(1000, 'User disconnected');
      wsRef.current = null;
    }
    setIsConnected(false);
    setIsConnecting(false);
  }, []);

  const setInterval = useCallback((newIntervalMs: number) => {
    setCurrentInterval(newIntervalMs);
    
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ interval_ms: newIntervalMs }));
    }
  }, []);

  const reconnect = useCallback(() => {
    disconnect();
    setTimeout(connect, 1000); // Wait 1 second before reconnecting
  }, [connect, disconnect]);

  // Effect to handle connection lifecycle
  useEffect(() => {
    if (enabled && token) {
      connect();
    } else {
      disconnect();
    }

    return () => {
      disconnect();
    };
  }, [enabled, token, chartType, connect, disconnect]);

  // Effect to handle interval changes
  useEffect(() => {
    setCurrentInterval(intervalMs);
  }, [intervalMs]);

  return {
    data,
    isConnected,
    isConnecting,
    error,
    setInterval,
    reconnect,
  };
}; 