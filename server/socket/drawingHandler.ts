import { Server, Socket } from "socket.io";
import { nanoid } from "nanoid";
import { eq, and, asc, sql } from "drizzle-orm";
import { db } from "../db";
import { drawingPaths, sheets, worships } from "../db/schema.js";
import { nowIso } from "../lib/date.js";
import { cancelProgress, progressKey, progressRegistry, progressRooms } from "./drawingProgress.js";

type DrawingRow = typeof drawingPaths.$inferSelect;
type DrawingPath = Omit<DrawingRow, "points"> & { points: { x: number; y: number }[] };
type MutationAck = (
  result:
    | { ok: true; sheetId: string; path?: DrawingPath; deletedPathIds?: string[] }
    | { ok: false; sheetId: string; error: string },
) => void;
type DrawingsSubscription = { worshipId: string; subscriptionId: string };

function parsePath(path: DrawingRow): DrawingPath {
  return { ...path, points: JSON.parse(path.points) };
}

function drawingsRoom(worshipId: string): string {
  return `drawings:worship:${worshipId}`;
}

// 하나의 union broadcast로 현재 페이지와 예배 전체 구독에 모두 속한 소켓의 중복 수신을 막는다.
function completedRooms(sheetId: string): string[] {
  const sheet = db.select({ worshipId: sheets.worshipId }).from(sheets).where(eq(sheets.id, sheetId)).get();
  return sheet ? [`sheet:${sheetId}`, drawingsRoom(sheet.worshipId)] : [`sheet:${sheetId}`];
}

export function setupDrawingHandler(io: Server, socket: Socket): void {
  let subscription: DrawingsSubscription | null = null;
  const progress = progressRegistry(io);
  const cancelOwned = (worshipId?: string, sheetId?: string) =>
    cancelProgress(
      io,
      (path) =>
        path.ownerSocketId === socket.id &&
        (worshipId === undefined || path.worshipId === worshipId) &&
        (sheetId === undefined || path.sheetId === sheetId),
    );
  const removeOwned = (sheetId: string, pathId: string) => {
    const key = progressKey(socket.id, sheetId, pathId);
    const path = progress.get(key);
    progress.delete(key);
    return path;
  };
  const cancelPath = (sheetId: string, pathId: string) => {
    const path = removeOwned(sheetId, pathId);
    socket.to(path ? progressRooms(path) : completedRooms(sheetId)).emit("drawing:cancelled", {
      sheetId,
      pathId,
      ownerSocketId: socket.id,
    });
  };
  socket.on("disconnecting", () => cancelOwned());
  socket.on("leave:worship", ({ worshipId }: { worshipId: string }) => cancelOwned(worshipId));
  socket.on("join:worship", ({ worshipId }: { worshipId: string }) => {
    cancelProgress(io, (path) => path.ownerSocketId === socket.id && path.worshipId !== worshipId);
  });

  socket.on("drawings:subscribe", (data: DrawingsSubscription) => {
    if (subscription) {
      if (subscription.worshipId !== data?.worshipId) cancelOwned(subscription.worshipId);
      socket.leave(drawingsRoom(subscription.worshipId));
    }
    subscription = null;

    try {
      if (!data?.worshipId || !data.subscriptionId) throw new Error("Invalid subscription");
      const worship = db.select({ id: worships.id }).from(worships).where(eq(worships.id, data.worshipId)).get();
      if (!worship) throw new Error("Worship not found");

      subscription = { worshipId: data.worshipId, subscriptionId: data.subscriptionId };
      // 현재 서버는 기본 메모리 adapter와 동기 SQLite를 사용한다. 가입부터 snapshot 전송까지
      // await 없이 수행하므로 다른 변경 핸들러가 snapshot과 후속 delta 사이를 끼어들지 않는다.
      socket.join(drawingsRoom(data.worshipId));
      const worshipSheets = db
        .select()
        .from(sheets)
        .where(eq(sheets.worshipId, data.worshipId))
        .orderBy(asc(sheets.order))
        .all();
      const allPaths = db
        .select({ path: drawingPaths })
        .from(drawingPaths)
        .innerJoin(sheets, eq(drawingPaths.sheetId, sheets.id))
        .where(eq(sheets.worshipId, data.worshipId))
        // 기존 페이지별 조회의 rowid 순서를 명시해 JOIN 이후에도 합성 순서를 보존한다.
        .orderBy(sql`${drawingPaths}.rowid`)
        .all();
      const pathsBySheet = new Map<string, DrawingPath[]>();
      for (const { path } of allPaths) {
        const paths = pathsBySheet.get(path.sheetId) ?? [];
        paths.push(parsePath(path));
        pathsBySheet.set(path.sheetId, paths);
      }
      const states = worshipSheets.map((sheet) => ({
        sheetId: sheet.id,
        paths: pathsBySheet.get(sheet.id) ?? [],
        inProgress: Array.from(progress.values())
          .filter((path) => path.sheetId === sheet.id && path.ownerSocketId !== socket.id)
          .map(({ worshipId: _worshipId, ...path }) => path),
      }));
      socket.emit("drawings:state", { ...subscription, sheets: states });
    } catch (error) {
      if (subscription) socket.leave(drawingsRoom(subscription.worshipId));
      subscription = null;
      console.error("[Drawing] Failed to subscribe:", error);
      socket.emit("drawings:error", {
        worshipId: data?.worshipId,
        subscriptionId: data?.subscriptionId,
        error: "Failed to load worship drawings",
      });
    }
  });

  socket.on("drawings:unsubscribe", (data: DrawingsSubscription) => {
    if (
      !subscription ||
      subscription.worshipId !== data?.worshipId ||
      subscription.subscriptionId !== data?.subscriptionId
    )
      return;
    cancelOwned(subscription.worshipId);
    socket.leave(drawingsRoom(subscription.worshipId));
    subscription = null;
  });

  // 전체 snapshot이 준비된 클라이언트는 진행 중 획 참여만 요청할 수 있다.
  socket.on(
    "join:sheet",
    ({ sheetId, requestId, withState }: { sheetId: string; requestId?: string; withState?: boolean }) => {
      socket.join(`sheet:${sheetId}`);
      if (withState === false) return;

      try {
        const paths = db.select().from(drawingPaths).where(eq(drawingPaths.sheetId, sheetId)).all();
        socket.emit("drawing:state", {
          sheetId,
          paths: paths.map(parsePath),
          ...(requestId === undefined ? {} : { requestId }),
        });
      } catch (error) {
        console.error("[Drawing] Failed to load paths:", error);
        socket.emit("drawing:error", {
          sheetId,
          ...(requestId === undefined ? {} : { requestId }),
          error: "Failed to load drawings",
        });
      }
    },
  );

  socket.on("leave:sheet", ({ sheetId }: { sheetId: string }) => {
    cancelOwned(undefined, sheetId);
    socket.leave(`sheet:${sheetId}`);
  });

  // 드로잉 시작 → 다른 사용자에게 브로드캐스트
  socket.on(
    "drawing:start",
    (data: {
      sheetId: string;
      pathId: string;
      profileId: string;
      color: string;
      width: number;
      isEraser: boolean;
      isHighlighter: boolean;
      point: { x: number; y: number };
    }) => {
      const sheet = db.select({ worshipId: sheets.worshipId }).from(sheets).where(eq(sheets.id, data.sheetId)).get();
      if (!sheet) return;
      const path = {
        sheetId: data.sheetId,
        pathId: data.pathId,
        profileId: data.profileId,
        color: data.color,
        width: data.width,
        isEraser: data.isEraser,
        isHighlighter: data.isHighlighter ?? false,
        ownerSocketId: socket.id,
        worshipId: sheet.worshipId,
        points: [data.point],
      };
      progress.set(progressKey(socket.id, data.sheetId, data.pathId), path);
      socket.to(progressRooms(path)).emit("drawing:started", { ...data, ownerSocketId: socket.id });
    },
  );

  // 드로잉 이동 → 브로드캐스트 (DB 저장 없음)
  socket.on("drawing:move", (data: { sheetId: string; pathId: string; point: { x: number; y: number } }) => {
    const path = progress.get(progressKey(socket.id, data.sheetId, data.pathId));
    if (!path) return;
    path.points.push(data.point);
    socket.to(progressRooms(path)).emit("drawing:moved", { ...data, ownerSocketId: socket.id });
  });

  // 진행 중 획 취소 → 피어의 진행 중 렌더만 정리 (DB 저장 전 단계라 지울 row가 없음)
  // 이 이벤트가 없으면 drawing:end로 확정되지 않고 버려진 획이 피어의 remoteInProgress에 영원히 남는다.
  // 수신측은 기존 drawing:cancelled 핸들러를 그대로 재사용한다.
  socket.on("drawing:cancel", (data: { sheetId: string; pathId: string }) => {
    if (!progress.has(progressKey(socket.id, data.sheetId, data.pathId))) return;
    cancelPath(data.sheetId, data.pathId);
  });

  // 드로잉 완료 → DB 저장 + 브로드캐스트
  socket.on(
    "drawing:end",
    (
      data: {
        sheetId: string;
        pathId: string;
        profileId: string;
        color: string;
        width: number;
        isEraser: boolean;
        isHighlighter: boolean;
        points: { x: number; y: number }[];
      },
      ack?: MutationAck,
    ) => {
      try {
        const id = data.pathId || nanoid();
        const now = nowIso();
        // 동일 id 재전송(재연결 flush 등)은 onConflictDoNothing으로 throw 없이 통과.
        // 진짜 저장 실패(FK 위반 등)는 throw되어 브로드캐스트도 함께 중단 —
        // DB에 없는 획이 타인 화면에 남는 것 방지
        const result = db
          .insert(drawingPaths)
          .values({
            id,
            sheetId: data.sheetId,
            profileId: data.profileId,
            color: data.color,
            width: data.width,
            points: JSON.stringify(data.points),
            isEraser: data.isEraser,
            isHighlighter: data.isHighlighter ?? false,
            createdAt: now,
          })
          .onConflictDoNothing()
          .run();

        // 충돌로 저장이 스킵됐다면(id 중복) 수신 payload가 아니라 DB의 기존 row를
        // 권위 데이터로 전파 — 같은 id로 다른 내용이 오더라도 화면과 DB가 갈라지지 않게.
        // 이때는 io.to로 송신자 자신도 포함시켜, 충돌 payload를 낙관적으로 넣어둔
        // 송신자 로컬 상태까지 권위 row로 교정한다(클라이언트는 같은 id 수신 시 교체).
        // 다른 시트의 기존 id와 충돌한 획은 그 시트에 존재하지 않으므로 전파하지 않는다.
        if (result.changes === 0) {
          const existing = db.select().from(drawingPaths).where(eq(drawingPaths.id, id)).get();
          if (!existing || existing.sheetId !== data.sheetId) {
            // 이 시트에 저장되지 못한 획 — 송신자에게는 전체 롤백(낙관적 획+undo 회수),
            // 나머지 피어에게는 이미 받은 started/moved의 진행 중 획 정리만 지시한다.
            // 피어에 rejected를 보내면 송신자 전용 롤백 로직까지 실행되므로 이벤트를 분리
            socket.emit("drawing:rejected", { sheetId: data.sheetId, pathId: id });
            cancelPath(data.sheetId, id);
            ack?.({ ok: false, sheetId: data.sheetId, error: "Path ID belongs to another sheet" });
            return;
          }
          removeOwned(data.sheetId, data.pathId);
          const path = parsePath(existing);
          io.to(completedRooms(existing.sheetId)).emit("drawing:ended", {
            ...path,
            pathId: existing.id,
            ownerSocketId: socket.id,
          });
          ack?.({ ok: true, sheetId: data.sheetId, path });
          return;
        }

        const path = parsePath(db.select().from(drawingPaths).where(eq(drawingPaths.id, id)).get()!);
        removeOwned(data.sheetId, data.pathId);
        socket
          .to(completedRooms(data.sheetId))
          .emit("drawing:ended", { ...path, pathId: id, ownerSocketId: socket.id });
        ack?.({ ok: true, sheetId: data.sheetId, path });
      } catch (error) {
        console.error("[Drawing] Failed to save path:", error);
        socket.emit("drawing:rejected", { sheetId: data.sheetId, pathId: data.pathId });
        cancelPath(data.sheetId, data.pathId);
        ack?.({ ok: false, sheetId: data.sheetId, error: "Failed to save drawing" });
      }
    },
  );

  // 드로잉 삭제 → DB 삭제 + 브로드캐스트 (멱등성)
  socket.on("drawing:delete", (data: { sheetId: string; pathId: string }, ack?: MutationAck) => {
    try {
      // 삭제를 (id + sheetId)로 스코프 — 잘못된/충돌한 id로 다른 시트의 획이 지워지는 것 방지
      const result = db
        .delete(drawingPaths)
        .where(and(eq(drawingPaths.id, data.pathId), eq(drawingPaths.sheetId, data.sheetId)))
        .run();
      socket.to(completedRooms(data.sheetId)).emit("drawing:deleted", data);
      ack?.({ ok: true, sheetId: data.sheetId, deletedPathIds: result.changes ? [data.pathId] : [] });
    } catch (error) {
      console.error("[Drawing] Failed to delete path:", error);
      ack?.({ ok: false, sheetId: data.sheetId, error: "Failed to delete drawing" });
    }
  });

  // 내 드로잉 전체 삭제 → DB 삭제 + 브로드캐스트
  socket.on("drawing:clear", (data: { sheetId: string; profileId: string }, ack?: MutationAck) => {
    try {
      const mine = and(eq(drawingPaths.sheetId, data.sheetId), eq(drawingPaths.profileId, data.profileId));
      const myPaths = db.select({ id: drawingPaths.id }).from(drawingPaths).where(mine).all();
      const deletedPathIds = myPaths.map((p) => p.id);

      db.delete(drawingPaths).where(mine).run();

      io.to(completedRooms(data.sheetId)).emit("drawing:cleared", {
        sheetId: data.sheetId,
        profileId: data.profileId,
        deletedPathIds,
      });
      ack?.({ ok: true, sheetId: data.sheetId, deletedPathIds });
    } catch (error) {
      console.error("[Drawing] Failed to clear paths:", error);
      ack?.({ ok: false, sheetId: data.sheetId, error: "Failed to clear drawings" });
    }
  });
}
