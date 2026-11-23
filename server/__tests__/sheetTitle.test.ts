import { createServer, type Server as HttpServer } from "node:http";
import type { AddressInfo } from "node:net";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import express from "express";
import request from "supertest";
import sharp from "sharp";
import { Server } from "socket.io";
import { io as connectSocket, type Socket } from "socket.io-client";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";
import { config } from "../config.js";
import { db } from "../db";
import { drawingPaths, sheets, worships, worshipTypes } from "../db/schema.js";
import { setupDatabase } from "../db/setup.js";
import {
  extractSheetTitleFromImage,
  formatExtractedSheetTitle,
  normalizeMusicalKey,
} from "../lib/sheetTitleExtractor.js";
import { resetSheetTitleJobs, setDefaultSheetTitleExtractor, waitForIdleSheetTitleJobs } from "../lib/sheetTitleJob.js";
import sheetsRouter from "../routes/sheets.js";
import worshipsRouter from "../routes/worships.js";
import { setupPresenceHandler } from "../socket/presenceHandler.js";

let tempDir: string;
let sampleImagePath: string;
let originalUploadsDir: string;

async function createSampleImageBuffer(): Promise<Buffer> {
  return sharp({
    create: {
      width: 240,
      height: 320,
      channels: 3,
      background: { r: 255, g: 255, b: 255 },
    },
  })
    .png()
    .toBuffer();
}

function nextSocketEvent<T>(socket: Socket, event: string): Promise<T> {
  return new Promise((resolve) => socket.once(event, resolve));
}

beforeAll(async () => {
  originalUploadsDir = config.uploadsDir;
  tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "gilteun-sheet-title-"));
  sampleImagePath = path.join(tempDir, "sample.png");
  const buffer = await createSampleImageBuffer();
  fs.writeFileSync(sampleImagePath, buffer);
});

afterAll(() => {
  config.uploadsDir = originalUploadsDir;
  config.geminiApiKey = null;
  fs.rmSync(tempDir, { recursive: true, force: true });
});

describe("normalizeMusicalKey & formatExtractedSheetTitle", () => {
  it("표준 장조·단조 및 기호·한글·전조를 정규화한다", () => {
    expect(normalizeMusicalKey("G")).toBe("G");
    expect(normalizeMusicalKey("Bb")).toBe("Bb");
    expect(normalizeMusicalKey("B♭")).toBe("Bb");
    expect(normalizeMusicalKey("F♯m")).toBe("F#m");
    expect(normalizeMusicalKey("A minor")).toBe("Am");
    expect(normalizeMusicalKey("A 단조")).toBe("Am");
    expect(normalizeMusicalKey("D major")).toBe("D");
    expect(normalizeMusicalKey("D 장조")).toBe("D");
    expect(normalizeMusicalKey("Key of Eb")).toBe("Eb");
    expect(normalizeMusicalKey("C 키")).toBe("C");
    expect(normalizeMusicalKey("G -> A")).toBe("G→A");
    expect(normalizeMusicalKey("F=>G")).toBe("F→G");
    expect(normalizeMusicalKey("G→G")).toBe("G");
    expect(normalizeMusicalKey("G→A→Bb")).toBe("G→A→Bb");
  });

  it("유효하지 않은 키 문자열이나 과도한 전조는 null을 반환한다", () => {
    expect(normalizeMusicalKey(null)).toBeNull();
    expect(normalizeMusicalKey("")).toBeNull();
    expect(normalizeMusicalKey("C7")).toBeNull();
    expect(normalizeMusicalKey("unknown")).toBeNull();
    expect(normalizeMusicalKey("G→A→B→C")).toBeNull();
    expect(normalizeMusicalKey("G→invalid")).toBeNull();
  });

  it("곡 제목과 키를 `곡명 (키)` 형식으로 조합한다", () => {
    expect(formatExtractedSheetTitle({ songTitle: "은혜", key: "G" })).toBe("은혜 (G)");
    expect(formatExtractedSheetTitle({ songTitle: "  주의  이름 \n 높이며 ", key: "B♭" })).toBe(
      "주의 이름 높이며 (Bb)",
    );
    expect(formatExtractedSheetTitle({ songTitle: "은혜", key: null })).toBe("은혜");
    expect(formatExtractedSheetTitle({ songTitle: "은혜", key: "unknown" })).toBe("은혜");
    expect(formatExtractedSheetTitle({ songTitle: "은혜 (G)", key: "G" })).toBe("은혜 (G)");
    expect(formatExtractedSheetTitle({ songTitle: "우리들을 위하여 (내 마음의 한 자리)", key: "A" })).toBe(
      "우리들을 위하여 (내 마음의 한 자리) (A)",
    );
    expect(formatExtractedSheetTitle({ songTitle: null, key: "G" })).toBeNull();
    expect(formatExtractedSheetTitle({ songTitle: "   ", key: "G" })).toBeNull();
  });

  it("긴 제목을 120자 이내로 자르면서 키 접미사는 보존한다", () => {
    const longTitle = "가".repeat(130);
    const formatted = formatExtractedSheetTitle({ songTitle: longTitle, key: "G→A" });
    expect(formatted).not.toBeNull();
    expect(formatted!.length).toBeLessThanOrEqual(120);
    expect(formatted!.endsWith(" (G→A)")).toBe(true);
  });
});

describe("extractSheetTitleFromImage", () => {
  it("Gemini JSON 응답을 파싱해 `곡명 (키)`를 반환하고 API 키를 헤더로만 전달한다", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(
        JSON.stringify({
          candidates: [
            {
              content: {
                parts: [
                  {
                    thought: true,
                    text: "internal reasoning",
                  },
                  {
                    text: JSON.stringify({
                      songTitle: "우리들을 위하여",
                      keySignature: "3 sharps",
                      chordEvidence: "A, E, A",
                      key: "A",
                    }),
                  },
                ],
              },
            },
          ],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );

    const title = await extractSheetTitleFromImage(sampleImagePath, {
      apiKey: "test-gemini-key",
      fetchImpl: fetchMock,
    });

    expect(title).toBe("우리들을 위하여 (A)");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toContain("gemini-3.5-flash-lite:generateContent");
    expect(String(url)).not.toContain("test-gemini-key");
    expect((init?.headers as Record<string, string>)["x-goog-api-key"]).toBe("test-gemini-key");
    const requestBody = JSON.parse(String(init?.body)) as { generationConfig?: Record<string, unknown> };
    expect(requestBody.generationConfig?.thinkingConfig).toBeUndefined();
  });

  it("제목이 null이거나 코드펜스 JSON이어도 올바르게 처리한다", async () => {
    const nullFetch = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(
        JSON.stringify({
          candidates: [{ content: { parts: [{ text: '{"songTitle":null,"key":null}' }] } }],
        }),
        { status: 200 },
      ),
    );
    expect(await extractSheetTitleFromImage(sampleImagePath, { apiKey: "k", fetchImpl: nullFetch })).toBeNull();

    const fencedFetch = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(
        JSON.stringify({
          candidates: [
            {
              content: {
                parts: [{ text: '```json\n{"songTitle":"천국은 마치","key":"G"}\n```' }],
              },
            },
          ],
        }),
        { status: 200 },
      ),
    );
    expect(await extractSheetTitleFromImage(sampleImagePath, { apiKey: "k", fetchImpl: fencedFetch })).toBe(
      "천국은 마치 (G)",
    );
  });

  it("HTTP 오류 또는 잘못된 JSON 응답 시 예외를 던진다", async () => {
    const httpErrorFetch = vi.fn<typeof fetch>().mockResolvedValue(new Response("quota exceeded", { status: 429 }));

    await expect(
      extractSheetTitleFromImage(sampleImagePath, { apiKey: "k", fetchImpl: httpErrorFetch }),
    ).rejects.toThrow("429");

    const badJsonFetch = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(
        JSON.stringify({
          candidates: [{ content: { parts: [{ text: "not valid json" }] } }],
        }),
        { status: 200 },
      ),
    );

    await expect(
      extractSheetTitleFromImage(sampleImagePath, { apiKey: "k", fetchImpl: badJsonFetch }),
    ).rejects.toThrow();
  });
});

describe("Sheet upload background title recognition routes & socket", () => {
  let httpServer: HttpServer;
  let io: Server;
  let app: express.Express;
  let socketUrl: string;
  let testUploadsDir: string;
  let clients: Socket[];

  beforeEach(async () => {
    setupDatabase();
    resetSheetTitleJobs();
    config.authPin = null;
    config.geminiApiKey = null;
    testUploadsDir = fs.mkdtempSync(path.join(tempDir, "uploads-"));
    config.uploadsDir = testUploadsDir;

    db.delete(drawingPaths).run();
    db.delete(sheets).run();
    db.delete(worships).run();
    db.delete(worshipTypes).run();

    db.insert(worshipTypes).values({ id: "type-1", name: "주일", color: "bg-primary" }).run();
    db.insert(worships)
      .values({
        id: "worship-1",
        title: "2026년 11월 23일 주일",
        date: "2026-11-23",
        typeId: "type-1",
        createdAt: "2026-11-23T00:00:00.000Z",
        updatedAt: "2026-11-23T00:00:00.000Z",
      })
      .run();

    app = express();
    app.use(express.json());
    httpServer = createServer(app);
    io = new Server(httpServer);
    app.set("io", io);
    app.use("/api", sheetsRouter);
    app.use("/api/worships", worshipsRouter);

    io.on("connection", (socket) => {
      setupPresenceHandler(io, socket);
    });

    clients = [];
    await new Promise<void>((resolve) => httpServer.listen(0, "127.0.0.1", resolve));
    socketUrl = `http://127.0.0.1:${(httpServer.address() as AddressInfo).port}`;
  });

  afterEach(async () => {
    await waitForIdleSheetTitleJobs();
    resetSheetTitleJobs();
    vi.restoreAllMocks();
    for (const c of clients) {
      c.disconnect();
    }
    await new Promise<void>((resolve) => io.close(() => resolve()));
  });

  async function connectWatcher(worshipId: string): Promise<Socket> {
    const socket = connectSocket(socketUrl, {
      transports: ["websocket"],
      reconnection: false,
      forceNew: true,
    });
    clients.push(socket);
    await nextSocketEvent(socket, "connect");
    const snapshot = nextSocketEvent<{ worshipId: string; sheets: unknown[] }>(socket, "sheets:updated");
    socket.emit("watch:worship-sheets", { worshipId });
    await snapshot;
    return socket;
  }

  it("업로드 시 titlePending=true를 즉시 반환하고 백그라운드 완료 후 제목·소켓·DB를 갱신한다", async () => {
    let resolveExtract!: (value: string | null) => void;
    setDefaultSheetTitleExtractor(
      () =>
        new Promise((resolve) => {
          resolveExtract = resolve;
        }),
    );

    const watcher = await connectWatcher("worship-1");
    const events: Array<{ worshipId: string; sheets: Array<{ id: string; title: string; titlePending?: boolean }> }> =
      [];
    watcher.on("sheets:updated", (payload) => events.push(payload));

    const pngBuffer = await createSampleImageBuffer();
    const uploadRes = await request(app)
      .post("/api/worships/worship-1/sheets")
      .attach("image", pngBuffer, "IMG_1234.png")
      .field("title", "IMG_1234");

    expect(uploadRes.status).toBe(201);
    expect(uploadRes.body.title).toBe("IMG_1234");
    expect(uploadRes.body.titlePending).toBe(true);

    const worshipDuringRes = await request(app).get("/api/worships/worship-1");
    expect(worshipDuringRes.body.sheets[0].titlePending).toBe(true);

    resolveExtract("우리들을 위하여 (A)");
    await waitForIdleSheetTitleJobs();
    await new Promise((r) => setTimeout(r, 30));

    const updatedRow = db.select().from(sheets).where(eq(sheets.id, uploadRes.body.id)).get();
    expect(updatedRow?.title).toBe("우리들을 위하여 (A)");

    const worshipAfterRes = await request(app).get("/api/worships/worship-1");
    expect(worshipAfterRes.body.sheets[0]).toMatchObject({
      title: "우리들을 위하여 (A)",
      titlePending: false,
    });

    expect(events.length).toBeGreaterThanOrEqual(2);
    expect(events[0].sheets[0]).toMatchObject({ title: "IMG_1234", titlePending: true });
    expect(events[events.length - 1].sheets[0]).toMatchObject({
      title: "우리들을 위하여 (A)",
      titlePending: false,
    });
  });

  it("인식 중 수동으로 제목을 수정하면 백그라운드 작업을 취소해 사용자 입력을 덮어쓰지 않는다", async () => {
    let aborted = false;
    let resolveExtract!: (value: string | null) => void;
    setDefaultSheetTitleExtractor(
      (_path, signal) =>
        new Promise((resolve) => {
          signal.addEventListener("abort", () => {
            aborted = true;
          });
          resolveExtract = resolve;
        }),
    );

    const pngBuffer = await createSampleImageBuffer();
    const uploadRes = await request(app)
      .post("/api/worships/worship-1/sheets")
      .attach("image", pngBuffer, "IMG_0001.png")
      .field("title", "IMG_0001");

    expect(uploadRes.status).toBe(201);
    const sheetId = uploadRes.body.id as string;

    const editRes = await request(app).put(`/api/sheets/${sheetId}`).send({ title: "직접 입력한 제목" });
    expect(editRes.status).toBe(200);
    expect(editRes.body.title).toBe("직접 입력한 제목");
    expect(editRes.body.titlePending).toBe(false);
    expect(aborted).toBe(true);

    resolveExtract("자동 추출 제목 (G)");
    await waitForIdleSheetTitleJobs();

    const row = db.select().from(sheets).where(eq(sheets.id, sheetId)).get();
    expect(row?.title).toBe("직접 입력한 제목");
  });

  it("인식 중 악보를 삭제하면 오류 없이 백그라운드 작업을 취소한다", async () => {
    let aborted = false;
    let resolveExtract!: (value: string | null) => void;
    setDefaultSheetTitleExtractor(
      (_path, signal) =>
        new Promise((resolve) => {
          signal.addEventListener("abort", () => {
            aborted = true;
          });
          resolveExtract = resolve;
        }),
    );

    const pngBuffer = await createSampleImageBuffer();
    const uploadRes = await request(app)
      .post("/api/worships/worship-1/sheets")
      .attach("image", pngBuffer, "IMG_0002.png")
      .field("title", "IMG_0002");

    const sheetId = uploadRes.body.id as string;
    const delRes = await request(app).delete(`/api/sheets/${sheetId}`);
    expect(delRes.status).toBe(200);
    expect(aborted).toBe(true);

    resolveExtract("삭제 후 결과 (D)");
    await waitForIdleSheetTitleJobs();

    expect(db.select().from(sheets).where(eq(sheets.id, sheetId)).get()).toBeUndefined();
  });

  it("추출기가 예외를 던지거나 null을 반환해도 기존 제목을 유지하고 titlePending을 해제한다", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    setDefaultSheetTitleExtractor(async () => {
      throw new Error("Gemini failure");
    });

    const watcher = await connectWatcher("worship-1");
    const finalBroadcast = new Promise<Array<{ title: string; titlePending?: boolean }>>((resolve) => {
      watcher.on("sheets:updated", (payload: { sheets: Array<{ title: string; titlePending?: boolean }> }) => {
        if (payload.sheets[0]?.titlePending === false) {
          resolve(payload.sheets);
        }
      });
    });

    const pngBuffer = await createSampleImageBuffer();
    const uploadRes = await request(app)
      .post("/api/worships/worship-1/sheets")
      .attach("image", pngBuffer, "IMG_FAIL.png")
      .field("title", "IMG_FAIL");

    expect(uploadRes.status).toBe(201);
    await waitForIdleSheetTitleJobs();

    const broadcasted = await finalBroadcast;
    expect(broadcasted[0]).toMatchObject({ title: "IMG_FAIL", titlePending: false });
    expect(warnSpy).toHaveBeenCalled();

    setDefaultSheetTitleExtractor(async () => null);
    const uploadNullRes = await request(app)
      .post("/api/worships/worship-1/sheets")
      .attach("image", pngBuffer, "IMG_NULL.png")
      .field("title", "IMG_NULL");

    await waitForIdleSheetTitleJobs();
    const nullRow = db.select().from(sheets).where(eq(sheets.id, uploadNullRes.body.id)).get();
    expect(nullRow?.title).toBe("IMG_NULL");
  });

  it("API 키와 extractor가 없으면 작업을 시작하지 않고 titlePending=false로 응답한다", async () => {
    setDefaultSheetTitleExtractor(null);
    config.geminiApiKey = null;

    const pngBuffer = await createSampleImageBuffer();
    const uploadRes = await request(app)
      .post("/api/worships/worship-1/sheets")
      .attach("image", pngBuffer, "IMG_NO_KEY.png")
      .field("title", "IMG_NO_KEY");

    expect(uploadRes.status).toBe(201);
    expect(uploadRes.body.title).toBe("IMG_NO_KEY");
    expect(uploadRes.body.titlePending).toBe(false);
  });
});
