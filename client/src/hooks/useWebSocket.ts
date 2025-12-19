import { useEffect, useRef, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";

export function useWebSocket() {
  const wsRef = useRef<WebSocket | null>(null);
  const queryClient = useQueryClient();

  const connect = useCallback(() => {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;

    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      console.log("WebSocket connected");
    };

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        
        // Invalidate queries based on message type
        if (message.type === "signal") {
          queryClient.invalidateQueries({ queryKey: ["signals"] });
        } else if (message.type === "trade") {
          queryClient.invalidateQueries({ queryKey: ["trades"] });
          queryClient.invalidateQueries({ queryKey: ["activeTrades"] });
        } else if (message.type === "log") {
          queryClient.invalidateQueries({ queryKey: ["logs"] });
        }
      } catch (error) {
        console.error("Failed to parse WebSocket message:", error);
      }
    };

    ws.onerror = (error) => {
      console.error("WebSocket error:", error);
    };

    ws.onclose = () => {
      console.log("WebSocket disconnected, reconnecting in 3s...");
      setTimeout(connect, 3000);
    };

    wsRef.current = ws;
  }, [queryClient]);

  useEffect(() => {
    connect();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [connect]);

  return wsRef.current;
}
