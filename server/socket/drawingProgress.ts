import type { Server } from "socket.io";

export type ProgressPath = {
  sheetId: string;
  pathId: string;
  ownerSocketId: string;
  profileId: string;
  color: string;
  width: number;
  isEraser: boolean;
  isHighlighter: boolean;
  points: { x: number; y: number }[];
};
export type StoredProgress = ProgressPath & { worshipId: string };

// 서버 인스턴스마다 격리하며 서버가 수거되면 registry도 함께 해제된다.
const registries = new WeakMap<Server, Map<string, StoredProgress>>();
export function progressRegistry(io: Server): Map<string, StoredProgress> {
  let registry = registries.get(io);
  if (!registry) {
    registry = new Map();
    registries.set(io, registry);
  }
  return registry;
}
export function progressKey(ownerSocketId: string, sheetId: string, pathId: string): string {
  return JSON.stringify([ownerSocketId, sheetId, pathId]);
}
export function progressRooms(path: Pick<StoredProgress, "sheetId" | "worshipId">): string[] {
  return [`sheet:${path.sheetId}`, `drawings:worship:${path.worshipId}`];
}
export function cancelProgress(io: Server, predicate: (path: StoredProgress) => boolean): void {
  const registry = progressRegistry(io);
  for (const [key, path] of registry) {
    if (!predicate(path)) continue;
    registry.delete(key);
    io.to(progressRooms(path)).except(path.ownerSocketId).emit("drawing:cancelled", {
      sheetId: path.sheetId,
      pathId: path.pathId,
      ownerSocketId: path.ownerSocketId,
    });
  }
}
