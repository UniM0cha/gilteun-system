import type { DrawingPath } from "../hooks/useDrawingSync";

export type DrawingMutation =
  | { kind: "add"; path: DrawingPath }
  | { kind: "delete"; pathIds: string[] }
  | { kind: "clear"; profileId: string };

interface PendingMutation {
  id: number;
  sheetId: string;
  change: DrawingMutation;
}

export interface DrawingSnapshotPage {
  sheetId: string;
  paths: DrawingPath[];
}

export type DrawingAcknowledgement =
  | { ok: true; sheetId: string; path?: DrawingPath; deletedPathIds?: string[] }
  | { ok: false; sheetId: string; error: string };

export function sameDrawing(a: DrawingPath, b: DrawingPath): boolean {
  if (a === b) return true;
  return (
    a.id === b.id &&
    a.sheetId === b.sheetId &&
    a.profileId === b.profileId &&
    a.color === b.color &&
    a.width === b.width &&
    a.isEraser === b.isEraser &&
    a.isHighlighter === b.isHighlighter &&
    a.points.length === b.points.length &&
    a.points.every((point, i) => point.x === b.points[i].x && point.y === b.points[i].y)
  );
}

function upsert(paths: DrawingPath[], path: DrawingPath): DrawingPath[] {
  const index = paths.findIndex((item) => item.id === path.id);
  if (index === -1) return [...paths, path];
  if (sameDrawing(paths[index], path)) return paths;
  const next = paths.filter((item, i) => i === index || item.id !== path.id);
  next[index] = path;
  return next;
}

function applyChange(paths: DrawingPath[], change: DrawingMutation): DrawingPath[] {
  if (change.kind === "add") return upsert(paths, change.path);
  if (change.kind === "clear") return paths.filter((path) => path.profileId !== change.profileId);
  const ids = new Set(change.pathIds);
  return paths.filter((path) => !ids.has(path.id));
}

/** One worship's confirmed vectors plus ordered local edits awaiting server confirmation. */
export class DrawingSession {
  private allowed = new Set<string>();
  private confirmed = new Map<string, DrawingPath[]>();
  private pending: PendingMutation[] = [];
  private serial = 0;
  private visible: ReadonlyMap<string, DrawingPath[]> = new Map();
  private listeners = new Set<() => void>();

  constructor(readonly worshipId: string | null = null) {}

  getSnapshot = (): ReadonlyMap<string, DrawingPath[]> => this.visible;

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  hasSheet(sheetId: string): boolean {
    return this.allowed.has(sheetId);
  }

  setSheets(sheetIds: string[]): void {
    this.allowed = new Set(sheetIds);
    for (const id of this.confirmed.keys()) {
      if (!this.allowed.has(id)) this.confirmed.delete(id);
    }
    this.pending = this.pending.filter((item) => this.allowed.has(item.sheetId));
    this.publish();
  }

  /** HTTP cache values may seed an unknown page, but never overwrite socket/local state. */
  seedPage(sheetId: string, paths: DrawingPath[]): void {
    if (!this.allowed.has(sheetId) || this.confirmed.has(sheetId)) return;
    this.confirmed.set(sheetId, paths);
    this.publish();
  }

  snapshot(pages: DrawingSnapshotPage[], reconciledThrough?: number): void {
    const included = new Set<string>();
    for (const page of pages) {
      if (!this.allowed.has(page.sheetId)) continue;
      included.add(page.sheetId);
      this.confirmed.set(page.sheetId, page.paths);
    }
    // On reconnect, Socket.IO has already flushed its own outbound queue before
    // this snapshot request. Reconcile uncertain edits from that queue exactly once;
    // never resend mutations ourselves (especially a non-idempotent profile clear).
    if (reconciledThrough !== undefined) {
      this.pending = this.pending.filter((item) => item.id > reconciledThrough || !included.has(item.sheetId));
    }
    this.publish();
  }

  checkpoint(): number {
    return this.serial;
  }

  mutate(sheetId: string, change: DrawingMutation): number | null {
    if (!this.allowed.has(sheetId)) return null;
    const id = ++this.serial;
    this.pending.push({ id, sheetId, change });
    this.publish();
    return id;
  }

  acknowledge(id: number, ack: DrawingAcknowledgement): void {
    const item = this.pending.find((pending) => pending.id === id);
    if (!item || item.sheetId !== ack.sheetId) return;
    if (ack.ok) {
      const base = this.confirmed.get(item.sheetId) ?? [];
      const change: DrawingMutation = ack.path
        ? { kind: "add", path: ack.path }
        : ack.deletedPathIds
          ? { kind: "delete", pathIds: ack.deletedPathIds }
          : item.change;
      this.confirmed.set(item.sheetId, applyChange(base, change));
    }
    this.pending = this.pending.filter((pending) => pending.id !== id);
    this.publish();
  }

  remote(sheetId: string, change: DrawingMutation): void {
    if (!this.allowed.has(sheetId)) return;
    // A delta before the first snapshot is not proof that the page is loaded.
    // The ordered subscription snapshot establishes readiness before later deltas.
    if (this.confirmed.has(sheetId)) {
      this.confirmed.set(sheetId, applyChange(this.confirmed.get(sheetId)!, change));
      this.publish();
    }
  }

  rejectPath(sheetId: string, pathId: string): void {
    this.pending = this.pending.filter(
      (item) => !(item.sheetId === sheetId && item.change.kind === "add" && item.change.path.id === pathId),
    );
    this.publish();
  }

  private publish(): void {
    const next = new Map(this.confirmed);
    for (const item of this.pending) {
      // Editing is only enabled for loaded pages; preserve that readiness rule even
      // if a caller schedules a mutation while its page is being removed.
      if (!next.has(item.sheetId)) continue;
      next.set(item.sheetId, applyChange(next.get(item.sheetId)!, item.change));
    }
    let changed = next.size !== this.visible.size;
    for (const [sheetId, paths] of next) {
      const previous = this.visible.get(sheetId);
      if (previous === paths) continue;
      if (previous && previous.length === paths.length && previous.every((path, i) => sameDrawing(path, paths[i]))) {
        next.set(sheetId, previous);
      } else {
        changed = true;
      }
    }
    if (!changed) return;
    this.visible = next;
    this.listeners.forEach((listener) => listener());
  }
}
