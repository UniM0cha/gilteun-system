import "dotenv/config";
import express from "express";
import { createServer } from "http";
import { Server as SocketIOServer } from "socket.io";
import cors from "cors";
import cookieParser from "cookie-parser";
import path from "path";
import os from "os";
import { config } from "./config.js";
import { setupDatabase } from "./db/setup.js";
import { runDrawingCoordMigration } from "./db/migrateDrawingCoords.js";
import { registerRoutes } from "./routes";
import { initSocket } from "./socket";
import { authMiddleware } from "./middleware/auth.js";
import authRouter from "./routes/auth.js";

function getLocalIP(): string {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name] || []) {
      if (iface.family === "IPv4" && !iface.internal) {
        return iface.address;
      }
    }
  }
  return "localhost";
}

// DB 테이블 생성
setupDatabase();

// 드로잉 좌표계 마이그레이션(letterbox→카드 전체 기준)을 1회 자동 적용. 멱등 플래그로 적용 후엔 즉시 스킵.
// 배포(서버 재시작) 직후 클라이언트 접속 전에 적용돼 좌표계 혼합 창을 없앤다.
// 적용에 실패(aborted/예외)하면 fail-closed로 부팅을 막는다 — 미적용 상태로 새 좌표계 클라이언트를
// 서비스하면 기존 획이 어긋나고, 그 사이 저장된 card-basis 획이 복구 후 재시도 때 이중 변환되기 때문.
// (already-applied/done은 정상 통과하므로 정상 운영에는 영향 없음 — aborted는 첫 적용 + 이미지 누락 시뿐.)
try {
  const result = await runDrawingCoordMigration();
  if (result.status === "aborted") {
    console.error(
      `[migrate-draw] 좌표계 마이그레이션 미적용(이미지 누락 시트: ${result.unresolvedSheets.join(", ")}). ` +
        "좌표계 혼합을 막기 위해 서버를 종료합니다. 이미지 파일을 복구한 뒤 다시 시작하세요.",
    );
    process.exit(1);
  }
} catch (err) {
  console.error("[migrate-draw] 마이그레이션 중 예외 — 좌표계 혼합 위험으로 서버를 종료합니다.", err);
  process.exit(1);
}

const app = express();
const httpServer = createServer(app);

// Middleware
app.use(cors({ credentials: true, origin: true }));
app.use(express.json());
app.use(cookieParser());

// 인증 라우트 (미들웨어 적용 전에 등록)
app.use("/api/auth", authRouter);

// 인증 미들웨어 (이후 모든 /api, /uploads에 적용)
app.use("/api", authMiddleware);

// Static files for uploads (이미지 파일명이 nanoid 기반이라 immutable 캐싱 안전)
app.use(
  "/uploads",
  authMiddleware,
  express.static(config.uploadsDir, {
    maxAge: "1y",
    immutable: true,
  }),
);

// API routes
registerRoutes(app);

// Socket.IO
const io = new SocketIOServer(httpServer, {
  cors: { origin: true, credentials: true },
});
app.set("io", io);
initSocket(io);

// Production: serve client build
if (config.isProduction) {
  app.use(express.static(config.clientDistDir));
  app.get("{*path}", (req, res) => {
    if (!req.path.startsWith("/api") && !req.path.startsWith("/uploads") && !req.path.startsWith("/socket.io")) {
      res.sendFile(path.join(config.clientDistDir, "index.html"));
    }
  });
}

httpServer.listen(config.port, "0.0.0.0", () => {
  const localIP = getLocalIP();
  console.log("");
  console.log("🎵 길튼 시스템 서버 시작!");
  console.log(`   로컬:    http://localhost:${config.port}`);
  console.log(`   네트워크: http://${localIP}:${config.port}`);
  if (config.authPin) {
    console.log(`   🔒 PIN 인증 활성화됨`);
  }
  console.log("");
});
