import express from "express";
import cookieParser from "cookie-parser";
import { authMiddleware } from "../../middleware/auth.js";
import authRouter from "../../routes/auth.js";
import { registerRoutes } from "../../routes";
import { setupDatabase } from "../../db/setup.js";

/** 실제 API 라우터를 등록한 통합 테스트용 앱. DB_PATH=:memory:에서만 사용한다. */
export function createApiApp(): express.Express {
  setupDatabase();
  const app = express();
  app.use(express.json());
  app.use(cookieParser());
  app.use("/api/auth", authRouter);
  app.use("/api", authMiddleware);
  registerRoutes(app);
  return app;
}
