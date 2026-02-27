import { Server } from "socket.io";
import { setupDrawingHandler } from "./drawingHandler.js";
import { setupCommandHandler } from "./commandHandler.js";
import { setupPresenceHandler } from "./presenceHandler.js";

export function initSocket(io: Server): void {
  io.on("connection", (socket) => {
    console.log(`[Socket] Connected: ${socket.id}`);

    setupDrawingHandler(io, socket);
    setupCommandHandler(io, socket);
    setupPresenceHandler(io, socket);

    socket.on("disconnect", () => {
      console.log(`[Socket] Disconnected: ${socket.id}`);
    });
  });
}
