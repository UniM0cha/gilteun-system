import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import { config } from "../config.js";
import { createApp } from "./helpers/createApp.js";

function setPin(pin: string | null) {
  config.authPin = pin;
}

describe("Auth API", () => {
  beforeEach(() => {
    setPin(null);
  });

  // ─── GET /api/auth/status ───

  describe("GET /api/auth/status", () => {
    it("AUTH_PIN 미설정 시 required: false 를 반환한다", async () => {
      setPin(null);
      const app = createApp();

      const res = await request(app).get("/api/auth/status");

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ required: false });
    });

    it("AUTH_PIN 설정, 쿠키 없음 → required: true, authenticated: false", async () => {
      setPin("1234");
      const app = createApp();

      const res = await request(app).get("/api/auth/status");

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ required: true, authenticated: false });
    });

    it("AUTH_PIN 설정, 올바른 쿠키 → required: true, authenticated: true", async () => {
      setPin("1234");
      const app = createApp();

      const res = await request(app).get("/api/auth/status").set("Cookie", "gilteun_auth=1234");

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ required: true, authenticated: true });
    });

    it("AUTH_PIN 설정, 틀린 쿠키 → required: true, authenticated: false", async () => {
      setPin("1234");
      const app = createApp();

      const res = await request(app).get("/api/auth/status").set("Cookie", "gilteun_auth=wrong");

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ required: true, authenticated: false });
    });

    it("AUTH_PIN 설정, 다른 이름의 쿠키 → authenticated: false", async () => {
      setPin("1234");
      const app = createApp();

      const res = await request(app).get("/api/auth/status").set("Cookie", "other_cookie=1234");

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ required: true, authenticated: false });
    });
  });

  // ─── POST /api/auth/verify ───

  describe("POST /api/auth/verify", () => {
    it("올바른 PIN → 200, success: true, 쿠키 설정", async () => {
      setPin("5678");
      const app = createApp();

      const res = await request(app).post("/api/auth/verify").send({ pin: "5678" });

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ success: true });

      // Set-Cookie 헤더에 gilteun_auth 쿠키가 있어야 한다
      const cookies = res.headers["set-cookie"];
      expect(cookies).toBeDefined();

      const authCookie = Array.isArray(cookies)
        ? cookies.find((c: string) => c.startsWith("gilteun_auth="))
        : undefined;
      expect(authCookie).toBeDefined();
      expect(authCookie).toContain("gilteun_auth=5678");
      expect(authCookie).toContain("HttpOnly");
      expect(authCookie).toContain("Path=/");
    });

    it("틀린 PIN → 401, 에러 메시지 반환", async () => {
      setPin("5678");
      const app = createApp();

      const res = await request(app).post("/api/auth/verify").send({ pin: "0000" });

      expect(res.status).toBe(401);
      expect(res.body).toEqual({ error: "PIN이 올바르지 않습니다" });
    });

    it("PIN 없이 요청 → 401", async () => {
      setPin("5678");
      const app = createApp();

      const res = await request(app).post("/api/auth/verify").send({});

      expect(res.status).toBe(401);
      expect(res.body).toEqual({ error: "PIN이 올바르지 않습니다" });
    });

    it("body 없이 요청 → 401", async () => {
      setPin("5678");
      const app = createApp();

      const res = await request(app).post("/api/auth/verify").set("Content-Type", "application/json").send();

      expect(res.status).toBe(401);
    });

    it("AUTH_PIN 미설정 시 항상 success: true", async () => {
      setPin(null);
      const app = createApp();

      const res = await request(app).post("/api/auth/verify").send({ pin: "anything" });

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ success: true });
    });

    it("AUTH_PIN 미설정 시 PIN 없이도 success: true", async () => {
      setPin(null);
      const app = createApp();

      const res = await request(app).post("/api/auth/verify").send({});

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ success: true });
    });

    it("쿠키의 SameSite 속성은 Lax 이다", async () => {
      setPin("1234");
      const app = createApp();

      const res = await request(app).post("/api/auth/verify").send({ pin: "1234" });

      const cookies = res.headers["set-cookie"];
      const authCookie = Array.isArray(cookies)
        ? cookies.find((c: string) => c.startsWith("gilteun_auth="))
        : undefined;
      expect(authCookie).toContain("SameSite=Lax");
    });
  });

  // ─── Auth Middleware ───

  describe("Auth Middleware", () => {
    it("AUTH_PIN 미설정 시 모든 요청 통과", async () => {
      setPin(null);
      const app = createApp();

      const res = await request(app).get("/api/profiles");

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ profiles: [] });
    });

    it("AUTH_PIN 설정, 쿠키 없음 → 401", async () => {
      setPin("1234");
      const app = createApp();

      const res = await request(app).get("/api/profiles");

      expect(res.status).toBe(401);
      expect(res.body).toEqual({ error: "인증이 필요합니다" });
    });

    it("AUTH_PIN 설정, 올바른 쿠키 → 통과", async () => {
      setPin("1234");
      const app = createApp();

      const res = await request(app).get("/api/profiles").set("Cookie", "gilteun_auth=1234");

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ profiles: [] });
    });

    it("AUTH_PIN 설정, 틀린 쿠키 → 401", async () => {
      setPin("1234");
      const app = createApp();

      const res = await request(app).get("/api/profiles").set("Cookie", "gilteun_auth=wrong");

      expect(res.status).toBe(401);
      expect(res.body).toEqual({ error: "인증이 필요합니다" });
    });

    it("auth 라우트는 미들웨어 영향을 받지 않는다", async () => {
      setPin("1234");
      const app = createApp();

      // /api/auth/status는 미들웨어 없이 접근 가능해야 한다
      const res = await request(app).get("/api/auth/status");

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("required");
    });

    it("다른 보호 라우트도 401 반환", async () => {
      setPin("9999");
      const app = createApp();

      const res = await request(app).get("/api/worships");

      expect(res.status).toBe(401);
      expect(res.body).toEqual({ error: "인증이 필요합니다" });
    });
  });

  // ─── 인증 플로우 통합 테스트 ───

  describe("인증 플로우 통합", () => {
    it("verify 후 받은 쿠키로 보호 라우트 접근 가능", async () => {
      setPin("7777");
      const app = createApp();

      // 1. PIN 인증
      const verifyRes = await request(app).post("/api/auth/verify").send({ pin: "7777" });

      expect(verifyRes.status).toBe(200);

      // 2. 응답에서 쿠키 추출
      const cookies = verifyRes.headers["set-cookie"];
      const authCookie = Array.isArray(cookies)
        ? cookies.find((c: string) => c.startsWith("gilteun_auth="))
        : undefined;
      expect(authCookie).toBeDefined();

      // 3. 쿠키를 사용하여 보호 라우트 접근
      const profilesRes = await request(app).get("/api/profiles").set("Cookie", authCookie!);

      expect(profilesRes.status).toBe(200);
      expect(profilesRes.body).toEqual({ profiles: [] });
    });

    it("verify 없이 보호 라우트 접근 → 401, 이후 verify → 접근 가능", async () => {
      setPin("3333");
      const app = createApp();

      // 1. 인증 없이 접근 시도
      const failRes = await request(app).get("/api/profiles");
      expect(failRes.status).toBe(401);

      // 2. PIN 인증
      const verifyRes = await request(app).post("/api/auth/verify").send({ pin: "3333" });
      expect(verifyRes.status).toBe(200);

      // 3. 쿠키로 재시도
      const cookies = verifyRes.headers["set-cookie"];
      const authCookie = Array.isArray(cookies)
        ? cookies.find((c: string) => c.startsWith("gilteun_auth="))
        : undefined;

      const successRes = await request(app).get("/api/profiles").set("Cookie", authCookie!);
      expect(successRes.status).toBe(200);
    });
  });
});
