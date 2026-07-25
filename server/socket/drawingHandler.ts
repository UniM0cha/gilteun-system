import { Server, Socket } from "socket.io";
import { nanoid } from "nanoid";
import { eq, and } from "drizzle-orm";
import { db } from "../db";
import { drawingPaths } from "../db/schema.js";
import { nowIso } from "../lib/date.js";

export function setupDrawingHandler(io: Server, socket: Socket): void {
  // Sheet Room 입장 → 기존 드로잉 전송
  socket.on("join:sheet", ({ sheetId }: { sheetId: string }) => {
    socket.join(`sheet:${sheetId}`);

    try {
      const paths = db.select().from(drawingPaths).where(eq(drawingPaths.sheetId, sheetId)).all();
      const parsed = paths.map((p) => ({
        ...p,
        points: JSON.parse(p.points),
      }));
      socket.emit("drawing:state", { sheetId, paths: parsed });
    } catch (error) {
      console.error("[Drawing] Failed to load paths:", error);
    }
  });

  socket.on("leave:sheet", ({ sheetId }: { sheetId: string }) => {
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
      socket.to(`sheet:${data.sheetId}`).emit("drawing:started", data);
    },
  );

  // 드로잉 이동 → 브로드캐스트 (DB 저장 없음)
  socket.on("drawing:move", (data: { sheetId: string; pathId: string; point: { x: number; y: number } }) => {
    socket.to(`sheet:${data.sheetId}`).emit("drawing:moved", data);
  });

  // 드로잉 완료 → DB 저장 + 브로드캐스트
  socket.on(
    "drawing:end",
    (data: {
      sheetId: string;
      pathId: string;
      profileId: string;
      color: string;
      width: number;
      isEraser: boolean;
      isHighlighter: boolean;
      points: { x: number; y: number }[];
    }) => {
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
            socket.to(`sheet:${data.sheetId}`).emit("drawing:cancelled", { sheetId: data.sheetId, pathId: id });
            return;
          }
          io.to(`sheet:${existing.sheetId}`).emit("drawing:ended", {
            id: existing.id,
            pathId: existing.id,
            sheetId: existing.sheetId,
            profileId: existing.profileId,
            color: existing.color,
            width: existing.width,
            isEraser: existing.isEraser,
            isHighlighter: existing.isHighlighter,
            points: JSON.parse(existing.points),
          });
          return;
        }

        socket.to(`sheet:${data.sheetId}`).emit("drawing:ended", {
          ...data,
          id,
        });
      } catch (error) {
        console.error("[Drawing] Failed to save path:", error);
      }
    },
  );

  // 드로잉 삭제 → DB 삭제 + 브로드캐스트 (멱등성)
  socket.on("drawing:delete", (data: { sheetId: string; pathId: string }) => {
    try {
      // 삭제를 (id + sheetId)로 스코프 — 잘못된/충돌한 id로 다른 시트의 획이 지워지는 것 방지
      db.delete(drawingPaths)
        .where(and(eq(drawingPaths.id, data.pathId), eq(drawingPaths.sheetId, data.sheetId)))
        .run();
      socket.to(`sheet:${data.sheetId}`).emit("drawing:deleted", data);
    } catch (error) {
      console.error("[Drawing] Failed to delete path:", error);
    }
  });

  // 내 드로잉 전체 삭제 → DB 삭제 + 브로드캐스트
  socket.on("drawing:clear", (data: { sheetId: string; profileId: string }) => {
    try {
      const mine = and(eq(drawingPaths.sheetId, data.sheetId), eq(drawingPaths.profileId, data.profileId));
      const myPaths = db.select({ id: drawingPaths.id }).from(drawingPaths).where(mine).all();
      const deletedPathIds = myPaths.map((p) => p.id);

      db.delete(drawingPaths).where(mine).run();

      io.to(`sheet:${data.sheetId}`).emit("drawing:cleared", {
        sheetId: data.sheetId,
        profileId: data.profileId,
        deletedPathIds,
      });
    } catch (error) {
      console.error("[Drawing] Failed to clear paths:", error);
    }
  });
}
