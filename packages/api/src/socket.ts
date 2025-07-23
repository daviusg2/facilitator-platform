import { Server } from "socket.io";
let io: Server;

export function initIO(server: any) {
  io = new Server(server, { cors: { origin: "http://localhost:5173" } });
  io.on("connection", (sock) =>
    sock.on("join-session", (id) => sock.join(id))
  );
}

export function getIO() {
  if (!io) throw new Error("Socket.io not initialised");
  return io;
}
