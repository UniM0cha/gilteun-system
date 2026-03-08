import { Router } from "express";
import { config } from "../config.js";

const router = Router();

const COOKIE_MAX_AGE = 30 * 24 * 60 * 60 * 1000; // 30일

router.get("/status", (req, res) => {
  if (!config.authPin) {
    res.json({ required: false });
    return;
  }

  const token = req.cookies?.gilteun_auth;
  res.json({
    required: true,
    authenticated: token === config.authPin,
  });
});

router.post("/verify", (req, res) => {
  if (!config.authPin) {
    res.json({ success: true });
    return;
  }

  const pin = req.body?.pin;
  if (pin !== config.authPin) {
    res.status(401).json({ error: "PIN이 올바르지 않습니다" });
    return;
  }

  res.cookie("gilteun_auth", config.authPin, {
    httpOnly: true,
    sameSite: "lax",
    secure: config.isProduction,
    maxAge: COOKIE_MAX_AGE,
    path: "/",
  });

  res.json({ success: true });
});

router.post("/logout", (_req, res) => {
  res.clearCookie("gilteun_auth", { path: "/" });
  res.json({ success: true });
});

export default router;
