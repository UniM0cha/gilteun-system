import express from "express";
import cookieParser from "cookie-parser";
import { authMiddleware } from "../../middleware/auth.js";
import authRouter from "../../routes/auth.js";

/**
 * 테스트용 Express 앱을 생성한다.
 * 실제 DB나 Socket.IO 없이 인증 관련 라우트만 등록한다.
 */
export function createApp(): express.Express {
  const app = express();
  app.use(express.json());
  app.use(cookieParser());

  // auth 라우트는 미들웨어 적용 전에 등록 (실제 서버와 동일)
  app.use("/api/auth", authRouter);

  // 인증 미들웨어 적용
  app.use("/api", authMiddleware);

  // 보호된 테스트 라우트
  app.get("/api/profiles", (_req, res) => {
    res.json({ profiles: [] });
  });

  app.get("/api/worships", (_req, res) => {
    res.json({ worships: [] });
  });

  return app;
}
