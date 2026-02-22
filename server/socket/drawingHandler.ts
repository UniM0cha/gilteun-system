import { Server, Socket } from 'socket.io';
import { nanoid } from 'nanoid';
import { eq } from 'drizzle-orm';
import { db } from '../db/index.js';
import { drawingPaths } from '../db/schema.js';

export function setupDrawingHandler(io: Server, socket: Socket): void {
  // Sheet Room 입장 → 기존 드로잉 전송
  socket.on('join:sheet', ({ sheetId }: { sheetId: string }) => {
    socket.join(`sheet:${sheetId}`);

    try {
      const paths = db
        .select()
        .from(drawingPaths)
        .where(eq(drawingPaths.sheetId, sheetId))
        .all();
      const parsed = paths.map((p) => ({
        ...p,
        points: JSON.parse(p.points),
      }));
      socket.emit('drawing:state', { sheetId, paths: parsed });
    } catch (error) {
      console.error('[Drawing] Failed to load paths:', error);
    }
  });

  socket.on('leave:sheet', ({ sheetId }: { sheetId: string }) => {
    socket.leave(`sheet:${sheetId}`);
  });

  // 드로잉 시작 → 다른 사용자에게 브로드캐스트
  socket.on(
    'drawing:start',
    (data: {
      sheetId: string;
      pathId: string;
      profileId: string;
      color: string;
      width: number;
      isEraser: boolean;
      point: { x: number; y: number };
    }) => {
      socket.to(`sheet:${data.sheetId}`).emit('drawing:started', data);
    },
  );

  // 드로잉 이동 → 브로드캐스트 (DB 저장 없음)
  socket.on(
    'drawing:move',
    (data: { sheetId: string; pathId: string; point: { x: number; y: number } }) => {
      socket.to(`sheet:${data.sheetId}`).emit('drawing:moved', data);
    },
  );

  // 드로잉 완료 → DB 저장 + 브로드캐스트
  socket.on(
    'drawing:end',
    (data: {
      sheetId: string;
      pathId: string;
      profileId: string;
      color: string;
      width: number;
      isEraser: boolean;
      points: { x: number; y: number }[];
    }) => {
      try {
        const id = data.pathId || nanoid();
        const now = new Date().toISOString();
        db.insert(drawingPaths)
          .values({
            id,
            sheetId: data.sheetId,
            profileId: data.profileId,
            color: data.color,
            width: data.width,
            points: JSON.stringify(data.points),
            isEraser: data.isEraser,
            createdAt: now,
          })
          .run();

        socket.to(`sheet:${data.sheetId}`).emit('drawing:ended', {
          ...data,
          id,
        });
      } catch (error) {
        console.error('[Drawing] Failed to save path:', error);
      }
    },
  );

  // 드로잉 삭제 → DB 삭제 + 브로드캐스트 (멱등성)
  socket.on('drawing:delete', (data: { sheetId: string; pathId: string }) => {
    try {
      db.delete(drawingPaths).where(eq(drawingPaths.id, data.pathId)).run();
      socket.to(`sheet:${data.sheetId}`).emit('drawing:deleted', data);
    } catch (error) {
      console.error('[Drawing] Failed to delete path:', error);
    }
  });

  // 내 드로잉 전체 삭제 → DB 삭제 + 브로드캐스트
  socket.on('drawing:clear', (data: { sheetId: string; profileId: string }) => {
    try {
      const myPaths = db
        .select({ id: drawingPaths.id })
        .from(drawingPaths)
        .where(eq(drawingPaths.sheetId, data.sheetId))
        .all()
        .filter((p) => {
          const full = db
            .select()
            .from(drawingPaths)
            .where(eq(drawingPaths.id, p.id))
            .get();
          return full?.profileId === data.profileId;
        });

      const deletedPathIds = myPaths.map((p) => p.id);

      for (const pathId of deletedPathIds) {
        db.delete(drawingPaths).where(eq(drawingPaths.id, pathId)).run();
      }

      io.to(`sheet:${data.sheetId}`).emit('drawing:cleared', {
        sheetId: data.sheetId,
        profileId: data.profileId,
        deletedPathIds,
      });
    } catch (error) {
      console.error('[Drawing] Failed to clear paths:', error);
    }
  });
}
