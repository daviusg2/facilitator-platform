import { useEffect, useRef } from "react";
import { io, Socket } from "socket.io-client";

export function useSessionSocket(sessionId: string, onNewResponse: (data: any) => void) {
  const socketRef = useRef<Socket | null>(null);

  
  useEffect(() => {
    const sock = io("http://localhost:4000");
    socketRef.current = sock;

    sock.emit("join-session", sessionId);
    sock.on("new-response", onNewResponse);

    return () => { sock.disconnect(); };
  }, [sessionId, onNewResponse]);
}
