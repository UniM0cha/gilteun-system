import { Server } from "socket.io";
import cookie from "cookie";
import { config } from "../config.js";
import { setupDrawingHandler } from "./drawingHandler.js";
import { setupCommandHandler } from "./commandHandler.js";
import { setupPresenceHandler } from "./presenceHandler.js";

export function initSocket(io: Server): void {
  // PIN 인증 미들웨어
  io.use((socket, next) => {
    if (!config.authPin) return next();

    const cookieHeader = socket.handshake.headers.cookie || "";
    const cookies = cookie.parse(cookieHeader);

    if (cookies.gilteun_auth === config.authPin) return next();
    next(new Error("인증이 필요합니다"));
  });

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
