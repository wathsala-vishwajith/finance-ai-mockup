import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';

interface UseChatWebSocketProps {
  enabled?: boolean;
  onMessage?: (message: any) => void;
}

interface UseChatWebSocketReturn {
  sendMessage: (message: string) => void;
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
  reconnect: () => void;
}

export const useChatWebSocket = ({
  enabled = true,
  onMessage,
}: UseChatWebSocketProps): UseChatWebSocketReturn => {
  const { accessToken, refreshAccessToken } = useAuth();
  const wsRef = useRef<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const reconnectTimeoutRef = useRef<number | null>(null);
  const lastTokenRef = useRef<string | null>(null);
  const retryCountRef = useRef(0);

  // Cleanup function
  const cleanup = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    if (wsRef.current) {
      console.log('Manually closing chat WebSocket connection');
      wsRef.current.close(1000, 'Manual disconnect');
      wsRef.current = null;
    }
    setIsConnected(false);
    setIsConnecting(false);
  }, []);

  // Send message function
  const sendMessage = useCallback((message: string) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      const messageData = {
        message,
        timestamp: new Date().toISOString(),
      };
      
      console.log('Sending chat message:', messageData);
      wsRef.current.send(JSON.stringify(messageData));
    } else {
      console.error('Cannot send message: WebSocket is not connected');
      setError('Cannot send message: Not connected to chat server');
    }
  }, []);

  // Create connection
  const connect = useCallback(async (forceTokenRefresh = false) => {
    if (!enabled || isConnecting || isConnected) {
      console.log('Skipping chat connection attempt:', { enabled, isConnecting, isConnected });
      return;
    }

    // Get current token, potentially refreshing it if needed
    let tokenToUse = accessToken;
    
    if (forceTokenRefresh || !tokenToUse) {
      console.log('Attempting to refresh token for chat WebSocket...');
      try {
        const newToken = await refreshAccessToken();
        tokenToUse = newToken;
        console.log('Token refresh successful for chat WebSocket');
      } catch (error) {
        console.error('Failed to refresh token for chat WebSocket:', error);
        setError('Authentication failed');
        return;
      }
    }

    if (!tokenToUse) {
      console.log('No valid token available for chat WebSocket');
      setError('No authentication token available');
      return;
    }

    console.log('Starting chat WebSocket connection...');
    setIsConnecting(true);
    setError(null);

    try {
      const wsUrl = `ws://localhost:8000/chat/ws?token=${encodeURIComponent(tokenToUse)}`;
      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        console.log('✅ Chat WebSocket connected successfully');
        setIsConnected(true);
        setIsConnecting(false);
        setError(null);
        lastTokenRef.current = tokenToUse;
        retryCountRef.current = 0;
      };

      ws.onmessage = (event) => {
        try {
          const parsedData = JSON.parse(event.data);
          
          if (parsedData.error) {
            console.error('Chat WebSocket error from server:', parsedData.error);
            
            // Check if it's an auth error
            if (parsedData.error.includes('Invalid token') || 
                parsedData.error.includes('expired') ||
                parsedData.error.includes('Authentication failed')) {
              console.log('Chat WebSocket auth error detected, will retry with token refresh');
              setError('Authentication expired, refreshing...');
              cleanup();
              // Retry with token refresh after a short delay
              setTimeout(() => connect(true), 1000);
              return;
            }
            
            setError(parsedData.error);
            return;
          }
          
          // Handle chat message
          if (onMessage) {
            onMessage(parsedData);
          }
        } catch (err) {
          console.error('Error parsing chat WebSocket message:', err);
          setError('Error parsing chat message');
        }
      };

      ws.onerror = (event) => {
        console.error('Chat WebSocket error event:', event);
        setError('WebSocket connection error');
        setIsConnecting(false);
      };

      ws.onclose = (event) => {
        console.log('🔌 Chat WebSocket closed:', { 
          code: event.code, 
          reason: event.reason, 
          wasClean: event.wasClean
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
          console.log(`Chat WebSocket auth failure detected (attempt ${retryCountRef.current}/2), refreshing token...`);
          setError(`Authentication expired, refreshing... (${retryCountRef.current}/2)`);
          
          // Retry with token refresh after a delay
          reconnectTimeoutRef.current = setTimeout(() => {
            console.log('Retrying chat WebSocket connection with token refresh...');
            connect(true);
          }, 2000);
          return;
        }

        // Only attempt reconnection for unexpected closures (non-auth)
        if (event.code !== 1000 && enabled && retryCountRef.current < 3 && !isAuthFailure) {
          retryCountRef.current += 1;
          const delay = Math.min(1000 * Math.pow(2, retryCountRef.current - 1), 10000);
          
          console.log(`Reconnecting chat WebSocket in ${delay}ms (attempt ${retryCountRef.current}/3)...`);
          setError(`Connection lost, reconnecting in ${Math.round(delay/1000)}s...`);
          
          reconnectTimeoutRef.current = setTimeout(() => {
            console.log('Attempting to reconnect chat WebSocket...');
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
      console.error('Error creating chat WebSocket:', err);
      setError('Failed to create WebSocket connection');
      setIsConnecting(false);
    }
  }, [accessToken, enabled, isConnecting, isConnected, onMessage, refreshAccessToken, cleanup]);

  // Manual reconnect
  const reconnect = useCallback(() => {
    console.log('Manual chat WebSocket reconnect requested');
    cleanup();
    retryCountRef.current = 0;
    setTimeout(() => connect(false), 1000);
  }, [cleanup, connect]);

  // Main connection effect - only responds to essential changes
  useEffect(() => {
    if (enabled && accessToken) {
      console.log('Chat WebSocket effect triggered:', { enabled, hasToken: !!accessToken });
      connect(false);
    } else {
      console.log('Chat WebSocket disabled or no token, cleaning up');
      cleanup();
    }

    return cleanup;
  }, [enabled, accessToken]); // Minimal dependencies

  // Handle token changes for existing connections
  useEffect(() => {
    if (isConnected && accessToken && accessToken !== lastTokenRef.current) {
      console.log('Token changed, reconnecting chat WebSocket...');
      cleanup();
      setTimeout(() => connect(false), 500);
    }
  }, [accessToken, isConnected, cleanup, connect]);

  // Cleanup on unmount
  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  return {
    sendMessage,
    isConnected,
    isConnecting,
    error,
    reconnect,
  };
}; 