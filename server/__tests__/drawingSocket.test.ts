import { createServer, type Server as HttpServer } from "node:http";
import type { AddressInfo } from "node:net";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Server } from "socket.io";
import { io as connectSocket, type Socket } from "socket.io-client";
import { eq } from "drizzle-orm";
import { db, sqlite } from "../db";
import { drawingPaths, sheets, worships, worshipTypes } from "../db/schema.js";
import { setupDatabase } from "../db/setup.js";
import { setupDrawingHandler } from "../socket/drawingHandler.js";
import { progressRegistry, type ProgressPath } from "../socket/drawingProgress.js";
import express from "express";
import request from "supertest";
import sheetsRouter from "../routes/sheets.js";
import worshipsRouter from "../routes/worships.js";

type Path = Omit<typeof drawingPaths.$inferSelect, "points"> & { points: { x: number; y: number }[] };
type State = {
  worshipId: string;
  subscriptionId: string;
  sheets: { sheetId: string; paths: Path[]; inProgress: ProgressPath[] }[];
};
type Ack = { ok: boolean; sheetId: string; path?: Path; deletedPathIds?: string[]; error?: string };

let http: HttpServer;
let io: Server;
let url: string;
let clients: Socket[];

function nextEvent<T>(socket: Socket, event: string): Promise<T> {
  return new Promise((resolve) => socket.once(event, resolve));
}

async function client(): Promise<Socket> {
  const socket = connectSocket(url, {
    transports: ["websocket"],
    reconnection: false,
    autoConnect: false,
    forceNew: true,
  });
  clients.push(socket);
  const connected = nextEvent(socket, "connect");
  socket.connect();
  await connected;
  return socket;
}

async function barrier(socket: Socket): Promise<void> {
  // 이 소켓의 앞선 이벤트를 모두 읽어 시간 지연 없이 미전달·중복 전달을 검증한다.
  await socket.timeout(2000).emitWithAck("test:barrier");
}

function collect(socket: Socket, event: string): unknown[] {
  const events: unknown[] = [];
  socket.on(event, (data) => events.push(data));
  return events;
}

async function subscribe(socket: Socket, worshipId = "worship-1", subscriptionId = "generation-1"): Promise<State> {
  const response = nextEvent<State>(socket, "drawings:state");
  socket.emit("drawings:subscribe", { worshipId, subscriptionId });
  return response;
}

async function join(
  socket: Socket,
  sheetId = "sheet-1",
  requestId?: string,
): Promise<{ sheetId: string; paths: Path[]; requestId?: string }> {
  const response = nextEvent<{ sheetId: string; paths: Path[]; requestId?: string }>(socket, "drawing:state");
  socket.emit("join:sheet", { sheetId, ...(requestId ? { requestId } : {}) });
  return response;
}

function drawing(pathId = "path-1", sheetId = "sheet-1", profileId = "profile-1") {
  return {
    pathId,
    sheetId,
    profileId,
    color: "#ff0000",
    width: 0.005,
    isEraser: false,
    isHighlighter: true,
    points: [
      { x: 0.1, y: 0.2 },
      { x: 0.2, y: 0.3 },
    ],
  };
}

function seedPath(pathId = "path-1", sheetId = "sheet-1", profileId = "profile-1"): void {
  const { pathId: id, points, ...rest } = drawing(pathId, sheetId, profileId);
  db.insert(drawingPaths)
    .values({ ...rest, id, points: JSON.stringify(points), createdAt: "2026-09-13T00:00:00.000Z" })
    .run();
}

async function mutate(socket: Socket, event: string, data: unknown): Promise<Ack> {
  return socket.timeout(2000).emitWithAck(event, data);
}

beforeEach(async () => {
  setupDatabase();
  sqlite.exec("DROP TRIGGER IF EXISTS fail_drawing_insert; DROP TRIGGER IF EXISTS fail_drawing_delete;");
  db.delete(drawingPaths).run();
  db.delete(sheets).run();
  db.delete(worships).run();
  db.delete(worshipTypes).run();
  db.insert(worshipTypes).values({ id: "type-1", name: "주일", color: "blue" }).run();
  for (const id of ["worship-1", "worship-2"]) {
    db.insert(worships)
      .values({ id, title: id, date: "2026-09-13", typeId: "type-1", createdAt: "now", updatedAt: "now" })
      .run();
  }
  for (const [id, worshipId, order] of [
    ["sheet-1", "worship-1", 0],
    ["sheet-2", "worship-1", 1],
    ["sheet-other", "worship-2", 0],
  ] as const) {
    db.insert(sheets)
      .values({ id, worshipId, order, fileName: `${id}.png`, title: id, imagePath: `${id}.png`, createdAt: "now" })
      .run();
  }
  clients = [];
  http = createServer();
  io = new Server(http);
  io.on("connection", (socket) => {
    setupDrawingHandler(io, socket);
    socket.on("test:barrier", (ack: () => void) => ack());
  });
  await new Promise<void>((resolve) => http.listen(0, "127.0.0.1", resolve));
  url = `http://127.0.0.1:${(http.address() as AddressInfo).port}`;
});

afterEach(async () => {
  for (const socket of clients) socket.disconnect();
  await new Promise<void>((resolve) => io.close(() => resolve()));
  vi.restoreAllMocks();
});

describe("Drawing socket subscriptions", () => {
  it("예배 범위의 모든 페이지와 빈 페이지를 기존 획 순서대로 보낸다", async () => {
    seedPath("z-first");
    seedPath("a-second");
    seedPath("private", "sheet-other");
    const socket = await client();
    const state = await subscribe(socket);
    expect(state).toMatchObject({ worshipId: "worship-1", subscriptionId: "generation-1" });
    expect(state.sheets.map((sheet) => sheet.sheetId)).toEqual(["sheet-1", "sheet-2"]);
    expect(state.sheets[0].paths.map((path) => path.id)).toEqual(["z-first", "a-second"]);
    expect(state.sheets[0].paths[0]).toMatchObject({ points: drawing().points, isHighlighter: true });
    expect(state.sheets[1].paths).toEqual([]);
  });

  it("여러 페이지의 획이 번갈아 저장되어도 전체 snapshot은 페이지별 기존 합성 순서를 유지한다", async () => {
    seedPath("z-first", "sheet-1");
    seedPath("z-second-page", "sheet-2");
    seedPath("a-second", "sheet-1");
    seedPath("a-second-page", "sheet-2");
    const socket = await client();
    const state = await subscribe(socket);
    expect(state.sheets[0].paths).toEqual((await join(socket, "sheet-1")).paths);
    expect(state.sheets[1].paths).toEqual((await join(socket, "sheet-2")).paths);
    expect(state.sheets.map((sheet) => sheet.paths.map((path) => path.id))).toEqual([
      ["z-first", "a-second"],
      ["z-second-page", "a-second-page"],
    ]);
  });

  it("전체 구독과 현재 페이지 구독의 교집합에도 완료 이벤트를 한 번만 보내고 다른 예배는 격리한다", async () => {
    const [writer, both, whole, legacy, other] = await Promise.all([client(), client(), client(), client(), client()]);
    await subscribe(writer);
    await join(writer);
    await subscribe(both);
    await join(both);
    await subscribe(whole);
    await join(legacy);
    await subscribe(other, "worship-2");
    const all = [writer, both, whole, legacy, other].map((socket) => collect(socket, "drawing:ended"));
    const ack = await mutate(writer, "drawing:end", drawing());
    await Promise.all([writer, both, whole, legacy, other].map(barrier));
    expect(all.map((events) => events.length)).toEqual([0, 1, 1, 1, 0]);
    expect(ack).toMatchObject({
      ok: true,
      sheetId: "sheet-1",
      path: { id: "path-1", isHighlighter: true, points: drawing().points },
    });
    expect(ack.path?.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(all[1][0]).toEqual({ ...ack.path, pathId: "path-1", ownerSocketId: writer.id });
  });

  it("진행 중 획은 예배 전체와 기존 페이지 구독에 전달하고 snapshot 이후 확정 delta를 순서대로 보낸다", async () => {
    const [writer, watcher, peer] = await Promise.all([client(), client(), client()]);
    const order: string[] = [];
    watcher.on("drawings:state", () => order.push("state"));
    watcher.on("drawing:ended", () => order.push("ended"));
    const progress = ["drawing:started", "drawing:moved", "drawing:cancelled"].map((event) => collect(watcher, event));
    const peerProgress = ["drawing:started", "drawing:moved", "drawing:cancelled"].map((event) => collect(peer, event));
    await subscribe(watcher);
    await subscribe(peer);
    await join(peer);
    writer.emit("drawing:start", { ...drawing(), point: drawing().points[0] });
    writer.emit("drawing:move", { sheetId: "sheet-1", pathId: "path-1", point: drawing().points[1] });
    writer.emit("drawing:cancel", { sheetId: "sheet-1", pathId: "path-1" });
    await mutate(writer, "drawing:end", drawing());
    await Promise.all([watcher, peer].map(barrier));
    expect(order).toEqual(["state", "ended"]);
    expect(progress.map((events) => events.length)).toEqual([1, 1, 1]);
    expect(peerProgress.map((events) => events.length)).toEqual([1, 1, 1]);
  });

  it("구독과 같은 소켓에서 즉시 이어 보낸 변경도 snapshot 뒤에 전달한다", async () => {
    seedPath();
    const socket = await client();
    const order: string[] = [];
    socket.on("drawings:state", () => order.push("state"));
    socket.on("drawing:cleared", () => order.push("cleared"));
    socket.emit("drawings:subscribe", { worshipId: "worship-1", subscriptionId: "generation-1" });
    await mutate(socket, "drawing:clear", { sheetId: "sheet-1", profileId: "profile-1" });
    expect(order).toEqual(["state", "cleared"]);
  });

  it("이전 세대의 해제를 무시하고 최신 해제 및 예배 변경은 전체 구독을 제거한다", async () => {
    const [writer, watcher] = await Promise.all([client(), client()]);
    await subscribe(watcher);
    await subscribe(watcher, "worship-1", "generation-2");
    watcher.emit("drawings:unsubscribe", { worshipId: "worship-1", subscriptionId: "generation-1" });
    await barrier(watcher);
    const ended = collect(watcher, "drawing:ended");
    await mutate(writer, "drawing:end", drawing("one"));
    await barrier(watcher);
    expect(ended).toHaveLength(1);
    watcher.emit("drawings:unsubscribe", { worshipId: "worship-1", subscriptionId: "generation-2" });
    await barrier(watcher);
    await mutate(writer, "drawing:end", drawing("two"));
    await barrier(watcher);
    expect(ended).toHaveLength(1);
    await subscribe(watcher);
    await subscribe(watcher, "worship-2", "generation-3");
    await mutate(writer, "drawing:end", drawing("three"));
    await mutate(writer, "drawing:end", drawing("four", "sheet-other"));
    await barrier(watcher);
    expect(ended).toHaveLength(2);
    expect(ended[1]).toMatchObject({ sheetId: "sheet-other" });
  });

  it("재연결 동안 완료된 추가·삭제를 새 전체 snapshot으로 복구한다", async () => {
    seedPath();
    const [writer, watcher] = await Promise.all([client(), client()]);
    await subscribe(watcher);
    watcher.disconnect();
    await mutate(writer, "drawing:delete", { sheetId: "sheet-1", pathId: "path-1" });
    await mutate(writer, "drawing:end", drawing("offline-change", "sheet-2"));
    const connected = nextEvent(watcher, "connect");
    watcher.connect();
    await connected;
    const state = await subscribe(watcher, "worship-1", "reconnected");
    expect(state.sheets[0].paths).toEqual([]);
    expect(state.sheets[1].paths.map((path) => path.id)).toEqual(["offline-change"]);
  });

  it("전체 조회 실패는 세대가 포함된 오류를 보내고 실패한 room을 정리한다", async () => {
    seedPath();
    db.update(drawingPaths).set({ points: "invalid-json" }).run();
    vi.spyOn(console, "error").mockImplementation(() => {});
    const [watcher, writer] = await Promise.all([client(), client()]);
    const failed = nextEvent(watcher, "drawings:error");
    watcher.emit("drawings:subscribe", { worshipId: "worship-1", subscriptionId: "failed" });
    expect(await failed).toEqual({
      worshipId: "worship-1",
      subscriptionId: "failed",
      error: "Failed to load worship drawings",
    });
    const ended = collect(watcher, "drawing:ended");
    await mutate(writer, "drawing:end", drawing("next"));
    await barrier(watcher);
    expect(ended).toEqual([]);
  });

  it("없는 예배는 구독 오류를 반환한다", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const socket = await client();
    const failed = nextEvent(socket, "drawings:error");
    socket.emit("drawings:subscribe", { worshipId: "missing", subscriptionId: "not-found" });
    expect(await failed).toMatchObject({ worshipId: "missing", subscriptionId: "not-found" });
  });
});

describe("Drawing socket compatibility and mutation acknowledgement", () => {
  it("withState=false는 snapshot 조회 없이 페이지에 참여해 이후 진행 중 획을 받는다", async () => {
    seedPath();
    // 읽으면 오류가 날 데이터도 조회하지 않으므로 state/error 없이 room 참여만 완료되어야 한다.
    db.update(drawingPaths).set({ points: "invalid-json" }).run();
    const [writer, peer] = await Promise.all([client(), client()]);
    const states = collect(peer, "drawing:state");
    const errors = collect(peer, "drawing:error");
    const moved = collect(peer, "drawing:moved");
    peer.emit("join:sheet", { sheetId: "sheet-1", requestId: "participate-only", withState: false });
    await barrier(peer);
    const move = { sheetId: "sheet-1", pathId: "progress", point: { x: 0.3, y: 0.4 } };
    writer.emit("drawing:start", { ...drawing("progress"), point: drawing().points[0] });
    writer.emit("drawing:move", move);
    await barrier(writer);
    await barrier(peer);
    expect(states).toEqual([]);
    expect(errors).toEqual([]);
    expect(moved).toEqual([{ ...move, ownerSocketId: writer.id }]);
  });

  it("기존 클라이언트는 ack 없이 쓰고 읽으며 requestId는 요청한 경우만 반환한다", async () => {
    const [writer, peer] = await Promise.all([client(), client()]);
    await join(peer);
    const ended = nextEvent(peer, "drawing:ended");
    writer.emit("drawing:end", drawing());
    expect(await ended).toMatchObject({ id: "path-1" });
    const oldState = await join(writer);
    expect(oldState).not.toHaveProperty("requestId");
    expect(oldState.paths).toHaveLength(1);
    expect(await join(writer, "sheet-1", "request-2")).toMatchObject({ requestId: "request-2" });
    const deleted = nextEvent(peer, "drawing:deleted");
    writer.emit("drawing:delete", { sheetId: "sheet-1", pathId: "path-1" });
    await deleted;
    expect((await join(writer)).paths).toEqual([]);
  });

  it("페이지 조회 실패도 요청 식별자가 포함된 오류를 반환한다", async () => {
    seedPath();
    db.update(drawingPaths).set({ points: "invalid-json" }).run();
    vi.spyOn(console, "error").mockImplementation(() => {});
    const socket = await client();
    const failed = nextEvent(socket, "drawing:error");
    socket.emit("join:sheet", { sheetId: "sheet-1", requestId: "failed-request" });
    expect(await failed).toEqual({ sheetId: "sheet-1", requestId: "failed-request", error: "Failed to load drawings" });
  });

  it("동일 ID 재전송은 DB의 기존 획을 ack와 모든 구독자에게 한 번씩 돌려준다", async () => {
    seedPath();
    const [writer, watcher] = await Promise.all([client(), client()]);
    for (const socket of [writer, watcher]) {
      await subscribe(socket);
      await join(socket);
    }
    const events = [writer, watcher].map((socket) => collect(socket, "drawing:ended"));
    const ack = await mutate(writer, "drawing:end", { ...drawing(), color: "#0000ff", points: [{ x: 0.9, y: 0.9 }] });
    await Promise.all([writer, watcher].map(barrier));
    expect(ack).toMatchObject({
      ok: true,
      path: { color: "#ff0000", points: drawing().points, createdAt: "2026-09-13T00:00:00.000Z" },
    });
    expect(events.map((items) => items.length)).toEqual([1, 1]);
    expect(events[0][0]).toEqual({ ...ack.path, pathId: "path-1", ownerSocketId: writer.id });
    expect(db.select().from(drawingPaths).all()).toHaveLength(1);
  });

  it("다른 페이지 ID 충돌과 FK 저장 실패는 실패 ack·롤백을 보내고 확정 획을 전파하지 않는다", async () => {
    seedPath("collision", "sheet-other");
    vi.spyOn(console, "error").mockImplementation(() => {});
    const [writer, peer] = await Promise.all([client(), client()]);
    await join(peer);
    await subscribe(peer);
    const ended = collect(peer, "drawing:ended");
    const cancelled = collect(peer, "drawing:cancelled");
    const rejected = collect(writer, "drawing:rejected");
    expect(await mutate(writer, "drawing:end", drawing("collision"))).toEqual({
      ok: false,
      sheetId: "sheet-1",
      error: "Path ID belongs to another sheet",
    });
    expect(await mutate(writer, "drawing:end", drawing("bad-fk", "missing-sheet"))).toEqual({
      ok: false,
      sheetId: "missing-sheet",
      error: "Failed to save drawing",
    });
    await barrier(peer);
    expect(ended).toEqual([]);
    expect(cancelled).toEqual([{ sheetId: "sheet-1", pathId: "collision", ownerSocketId: writer.id }]);
    expect(rejected).toEqual([
      { sheetId: "sheet-1", pathId: "collision" },
      { sheetId: "missing-sheet", pathId: "bad-fk" },
    ]);
    expect(db.select().from(drawingPaths).all()).toHaveLength(1);
  });

  it("삭제와 전체 삭제는 영향받은 ID를 반환하고 전체 구독에 한 번만 반영한다", async () => {
    seedPath("delete-me");
    seedPath("clear-me");
    seedPath("someone-else", "sheet-1", "profile-2");
    seedPath("other-page", "sheet-2");
    const [writer, watcher] = await Promise.all([client(), client()]);
    for (const socket of [writer, watcher]) {
      await subscribe(socket);
      await join(socket);
    }
    const deleted = [writer, watcher].map((socket) => collect(socket, "drawing:deleted"));
    const cleared = [writer, watcher].map((socket) => collect(socket, "drawing:cleared"));
    expect(await mutate(writer, "drawing:delete", { sheetId: "sheet-1", pathId: "delete-me" })).toEqual({
      ok: true,
      sheetId: "sheet-1",
      deletedPathIds: ["delete-me"],
    });
    expect(await mutate(writer, "drawing:clear", { sheetId: "sheet-1", profileId: "profile-1" })).toEqual({
      ok: true,
      sheetId: "sheet-1",
      deletedPathIds: ["clear-me"],
    });
    await barrier(watcher);
    expect(deleted.map((events) => events.length)).toEqual([0, 1]);
    expect(cleared.map((events) => events.length)).toEqual([1, 1]);
    expect(cleared[0][0]).toEqual({ sheetId: "sheet-1", profileId: "profile-1", deletedPathIds: ["clear-me"] });
    expect(
      db
        .select()
        .from(drawingPaths)
        .all()
        .map((path) => path.id),
    ).toEqual(["someone-else", "other-page"]);
    expect(await mutate(writer, "drawing:delete", { sheetId: "sheet-1", pathId: "other-page" })).toMatchObject({
      ok: true,
      deletedPathIds: [],
    });
    expect(await mutate(writer, "drawing:delete", { sheetId: "sheet-1", pathId: "delete-me" })).toMatchObject({
      ok: true,
      deletedPathIds: [],
    });
    expect(db.select().from(drawingPaths).where(eq(drawingPaths.id, "other-page")).get()).toBeDefined();
  });

  it("실제 DB 추가·삭제 오류는 실패 ack를 보내고 저장된 그림과 구독자 상태를 보존한다", async () => {
    seedPath();
    sqlite.exec(`CREATE TRIGGER fail_drawing_insert BEFORE INSERT ON drawing_paths BEGIN SELECT RAISE(ABORT, 'test insertion failure'); END;
      CREATE TRIGGER fail_drawing_delete BEFORE DELETE ON drawing_paths BEGIN SELECT RAISE(ABORT, 'test deletion failure'); END;`);
    vi.spyOn(console, "error").mockImplementation(() => {});
    const [writer, watcher] = await Promise.all([client(), client()]);
    await subscribe(watcher);
    const completed = ["drawing:ended", "drawing:deleted", "drawing:cleared"].map((event) => collect(watcher, event));
    expect(await mutate(writer, "drawing:end", drawing("fail"))).toMatchObject({
      ok: false,
      error: "Failed to save drawing",
    });
    expect(await mutate(writer, "drawing:delete", { sheetId: "sheet-1", pathId: "path-1" })).toMatchObject({
      ok: false,
      error: "Failed to delete drawing",
    });
    expect(await mutate(writer, "drawing:clear", { sheetId: "sheet-1", profileId: "profile-1" })).toMatchObject({
      ok: false,
      error: "Failed to clear drawings",
    });
    await barrier(watcher);
    expect(completed).toEqual([[], [], []]);
    expect(
      db
        .select()
        .from(drawingPaths)
        .all()
        .map((path) => path.id),
    ).toEqual(["path-1"]);
  });
});

describe("Worship-wide in-progress strokes", () => {
  async function start(socket: Socket, pathId = "path-1", sheetId = "sheet-1") {
    socket.emit("drawing:start", { ...drawing(pathId, sheetId), point: drawing().points[0] });
    socket.emit("drawing:move", { sheetId, pathId, point: drawing().points[1] });
    await barrier(socket);
  }

  it("다른 페이지를 보는 기기에 진행획을 한 번 보내며 중간 입장은 앞부분부터 복원한다", async () => {
    const [writer, watcher, newcomer] = await Promise.all([client(), client(), client()]);
    await subscribe(writer);
    await subscribe(watcher);
    await join(watcher, "sheet-2"); // 다른 페이지를 보아도 전체 구독으로 진행획을 받는다.
    const started = collect(watcher, "drawing:started");
    const moved = collect(watcher, "drawing:moved");
    await start(writer);
    await barrier(watcher);
    expect(started).toHaveLength(1);
    expect(moved).toHaveLength(1);
    const state = await subscribe(newcomer);
    expect(state.sheets[0].inProgress).toEqual([
      {
        ...drawing(),
        ownerSocketId: writer.id,
      },
    ]);
    expect(state.sheets[1].inProgress).toEqual([]);
    expect((await subscribe(writer, "worship-1", "refresh")).sheets[0].inProgress).toEqual([]);
    const after = nextEvent(watcher, "drawing:moved");
    writer.emit("drawing:move", { sheetId: "sheet-1", pathId: "path-1", point: { x: 0.7, y: 0.8 } });
    expect(await after).toMatchObject({ ownerSocketId: writer.id });
    expect((await subscribe(newcomer)).sheets[0].inProgress[0].points).toHaveLength(3);
  });

  it("동일 path ID도 소유자별로 구분하며 타인의 move/cancel은 기존 획을 바꾸지 않는다", async () => {
    const [a, b, watcher] = await Promise.all([client(), client(), client()]);
    await start(a);
    b.emit("drawing:move", { sheetId: "sheet-1", pathId: "path-1", point: { x: 0.9, y: 0.9 } });
    b.emit("drawing:cancel", { sheetId: "sheet-1", pathId: "path-1", ownerSocketId: a.id });
    await barrier(b);
    expect((await subscribe(watcher)).sheets[0].inProgress[0].points).toEqual(drawing().points);
    await start(b);
    expect((await subscribe(watcher)).sheets[0].inProgress).toHaveLength(2);
    b.emit("drawing:cancel", { sheetId: "sheet-1", pathId: "path-1" });
    await barrier(b);
    const remaining = (await subscribe(watcher)).sheets[0].inProgress;
    expect(remaining).toHaveLength(1);
    expect(remaining[0].ownerSocketId).toBe(a.id);
    await mutate(a, "drawing:end", drawing());
    const state = await subscribe(watcher);
    expect(state.sheets[0].inProgress).toEqual([]);
    expect(state.sheets[0].paths).toHaveLength(1);
  });

  it("move는 DB 접근 없이 registry만 갱신하며 존재하지 않는 페이지의 start는 무시한다", async () => {
    const [writer, watcher] = await Promise.all([client(), client()]);
    await start(writer);
    const select = vi.spyOn(db, "select");
    const insert = vi.spyOn(db, "insert");
    writer.emit("drawing:move", { sheetId: "sheet-1", pathId: "path-1", point: { x: 0.4, y: 0.5 } });
    await barrier(writer);
    expect(select).not.toHaveBeenCalled();
    expect(insert).not.toHaveBeenCalled();
    select.mockRestore();
    insert.mockRestore();
    await start(writer, "missing", "absent");
    expect(progressRegistry(io).size).toBe(1);
    expect((await subscribe(watcher)).sheets[0].inProgress[0].points).toHaveLength(3);
  });

  it.each(["leave:sheet", "leave:worship", "drawings:unsubscribe", "change-worship", "disconnect"])(
    "%s는 소유자의 임시획을 정리하고 구독자에게 취소를 알린다",
    async (action) => {
      const [writer, watcher] = await Promise.all([client(), client()]);
      await subscribe(writer);
      await subscribe(watcher);
      await start(writer);
      const cancelled = nextEvent(watcher, "drawing:cancelled");
      const ownerSocketId = writer.id;
      if (action === "disconnect") writer.disconnect();
      else if (action === "change-worship") await subscribe(writer, "worship-2", "other");
      else {
        writer.emit(action, { sheetId: "sheet-1", worshipId: "worship-1", subscriptionId: "generation-1" });
        await barrier(writer);
      }
      expect(await cancelled).toEqual({ sheetId: "sheet-1", pathId: "path-1", ownerSocketId });
      expect((await subscribe(watcher)).sheets[0].inProgress).toEqual([]);
    },
  );

  it("저장 실패와 다른 페이지 ID 충돌은 본인 임시획만 취소한다", async () => {
    const [writer, watcher] = await Promise.all([client(), client()]);
    await subscribe(watcher);
    await start(writer);
    sqlite.exec(
      "CREATE TRIGGER fail_drawing_insert BEFORE INSERT ON drawing_paths BEGIN SELECT RAISE(ABORT, 'failed'); END;",
    );
    vi.spyOn(console, "error").mockImplementation(() => {});
    const cancelled = collect(watcher, "drawing:cancelled");
    expect(await mutate(writer, "drawing:end", drawing())).toMatchObject({ ok: false });
    sqlite.exec("DROP TRIGGER fail_drawing_insert;");
    seedPath("path-1", "sheet-other");
    await start(writer);
    expect(await mutate(writer, "drawing:end", drawing())).toMatchObject({ ok: false });
    await barrier(watcher);
    expect(cancelled).toHaveLength(2);
    expect((await subscribe(watcher)).sheets[0].inProgress).toEqual([]);
    expect(progressRegistry(io).size).toBe(0);
  });

  it.each(["sheet", "worship"])("%s 삭제 REST는 진행획을 정리하고 취소를 전파한다", async (target) => {
    const app = express();
    app.use(express.json());
    app.set("io", io);
    app.use("/api", sheetsRouter);
    app.use("/api/worships", worshipsRouter);
    const [writer, watcher] = await Promise.all([client(), client()]);
    await subscribe(watcher);
    await start(writer);
    await request(app).put("/api/sheets/sheet-1").send({ title: "Updated title" }).expect(200);
    expect(progressRegistry(io).size).toBe(1);
    const cancelled = nextEvent(watcher, "drawing:cancelled");
    await request(app)
      .delete(target === "sheet" ? "/api/sheets/sheet-1" : "/api/worships/worship-1")
      .expect(200);
    expect(await cancelled).toMatchObject({ sheetId: "sheet-1", ownerSocketId: writer.id });
    expect(progressRegistry(io).size).toBe(0);
  });

  it("서버 인스턴스끼리는 진행획을 공유하지 않는다", async () => {
    const writer = await client();
    await start(writer);
    const secondHttp = createServer();
    const secondIo = new Server(secondHttp);
    secondIo.on("connection", (socket) => setupDrawingHandler(secondIo, socket));
    await new Promise<void>((resolve) => secondHttp.listen(0, "127.0.0.1", resolve));
    const remote = connectSocket(`http://127.0.0.1:${(secondHttp.address() as AddressInfo).port}`, {
      transports: ["websocket"],
    });
    try {
      await nextEvent(remote, "connect");
      expect((await subscribe(remote)).sheets[0].inProgress).toEqual([]);
      expect(progressRegistry(io).size).toBe(1);
    } finally {
      remote.disconnect();
      await new Promise<void>((resolve) => secondIo.close(() => resolve()));
    }
  });
});
