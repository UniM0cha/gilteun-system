import type { Server } from "socket.io";
import { eq } from "drizzle-orm";
import { db } from "../db";
import { sheets } from "../db/schema.js";
import { config } from "../config.js";
import { extractSheetTitleFromImage } from "./sheetTitleExtractor.js";

const MAX_CONCURRENT_JOBS = 3;

export type SheetTitleExtractor = (imagePath: string, signal: AbortSignal) => Promise<string | null>;

export interface EnqueueSheetTitleJobOptions {
  sheetId: string;
  worshipId: string;
  imagePath: string;
  initialTitle: string;
  io?: Server;
  onUpdated: (io: Server, worshipId: string) => void;
  extractor?: SheetTitleExtractor;
}

interface PendingJob {
  sheetId: string;
  worshipId: string;
  imagePath: string;
  initialTitle: string;
  io?: Server;
  onUpdated: (io: Server, worshipId: string) => void;
  extractor: SheetTitleExtractor;
  controller: AbortController;
  cancelled: boolean;
}

const pendingJobs = new Map<string, PendingJob>();
const queuedJobIds: string[] = [];
const idleResolvers: Array<() => void> = [];
let activeJobCount = 0;
let defaultExtractorOverride: SheetTitleExtractor | null = null;

function isAbortError(error: unknown, signal: AbortSignal): boolean {
  if (signal.aborted) return true;
  return typeof error === "object" && error !== null && "name" in error && error.name === "AbortError";
}

function resolveDefaultExtractor(): SheetTitleExtractor | null {
  if (defaultExtractorOverride) {
    return defaultExtractorOverride;
  }
  if (!config.geminiApiKey) {
    return null;
  }
  const apiKey = config.geminiApiKey;
  const model = config.geminiModel;
  return (imagePath, signal) => extractSheetTitleFromImage(imagePath, { apiKey, model, signal });
}

function notifyIfIdle(): void {
  if (activeJobCount === 0 && queuedJobIds.length === 0 && pendingJobs.size === 0) {
    while (idleResolvers.length > 0) {
      const resolve = idleResolvers.shift();
      resolve?.();
    }
  }
}

async function runJob(job: PendingJob): Promise<void> {
  if (job.cancelled || job.controller.signal.aborted || pendingJobs.get(job.sheetId) !== job) {
    return;
  }

  try {
    const extractedTitle = await job.extractor(job.imagePath, job.controller.signal);

    if (job.cancelled || job.controller.signal.aborted || pendingJobs.get(job.sheetId) !== job) {
      return;
    }

    pendingJobs.delete(job.sheetId);

    const current = db.select().from(sheets).where(eq(sheets.id, job.sheetId)).get();
    if (!current) {
      return;
    }

    if (extractedTitle && current.title === job.initialTitle) {
      db.update(sheets).set({ title: extractedTitle }).where(eq(sheets.id, job.sheetId)).run();
    }

    if (job.io) {
      job.onUpdated(job.io, job.worshipId);
    }
  } catch (error) {
    if (job.cancelled || isAbortError(error, job.controller.signal) || pendingJobs.get(job.sheetId) !== job) {
      if (pendingJobs.get(job.sheetId) === job) {
        pendingJobs.delete(job.sheetId);
      }
      return;
    }

    console.warn(`[sheetTitleJob] Failed to extract title for sheet ${job.sheetId}:`, error);
    pendingJobs.delete(job.sheetId);

    const current = db.select().from(sheets).where(eq(sheets.id, job.sheetId)).get();
    if (current && job.io) {
      job.onUpdated(job.io, job.worshipId);
    }
  }
}

function pumpQueue(): void {
  while (activeJobCount < MAX_CONCURRENT_JOBS && queuedJobIds.length > 0) {
    const nextId = queuedJobIds.shift();
    if (!nextId) continue;

    const job = pendingJobs.get(nextId);
    if (!job || job.cancelled || job.controller.signal.aborted) {
      continue;
    }

    activeJobCount++;
    void runJob(job).finally(() => {
      activeJobCount--;
      pumpQueue();
      notifyIfIdle();
    });
  }
}

/**
 * 해당 악보의 백그라운드 제목 인식이 아직 진행 중인지 반환한다.
 */
export function isSheetTitlePending(sheetId: string): boolean {
  return pendingJobs.has(sheetId);
}

/**
 * 단일 악보 객체에 `titlePending` 상태를 부착한다.
 */
export function attachTitlePending<T extends { id: string }>(sheet: T): T & { titlePending: boolean } {
  return {
    ...sheet,
    titlePending: isSheetTitlePending(sheet.id),
  };
}

/**
 * 악보 목록에 `titlePending` 상태를 일괄 부착한다.
 */
export function attachTitlePendingList<T extends { id: string }>(list: T[]): Array<T & { titlePending: boolean }> {
  return list.map(attachTitlePending);
}

/**
 * 진행 중이거나 대기 중인 제목 인식 작업을 취소해 수동 수정·삭제 이후 덮어쓰기를 방지한다.
 */
export function cancelSheetTitleJob(sheetId: string): void {
  const job = pendingJobs.get(sheetId);
  if (!job) return;

  job.cancelled = true;
  pendingJobs.delete(sheetId);
  job.controller.abort();
  notifyIfIdle();
}

/**
 * 악보 제목·코드 인식 작업을 백그라운드 큐에 등록한다.
 * 사용할 extractor나 API 키가 없으면 작업을 등록하지 않고 `false`를 반환한다.
 */
export function enqueueSheetTitleJob(options: EnqueueSheetTitleJobOptions): boolean {
  const extractor = options.extractor ?? resolveDefaultExtractor();
  if (!extractor) {
    return false;
  }

  cancelSheetTitleJob(options.sheetId);

  const job: PendingJob = {
    sheetId: options.sheetId,
    worshipId: options.worshipId,
    imagePath: options.imagePath,
    initialTitle: options.initialTitle,
    io: options.io,
    onUpdated: options.onUpdated,
    extractor,
    controller: new AbortController(),
    cancelled: false,
  };

  pendingJobs.set(options.sheetId, job);
  queuedJobIds.push(options.sheetId);
  pumpQueue();
  return true;
}

/**
 * 테스트용 기본 extractor 오버라이드를 설정한다.
 */
export function setDefaultSheetTitleExtractor(extractor: SheetTitleExtractor | null): void {
  defaultExtractorOverride = extractor;
}

/**
 * 대기·실행 중인 모든 백그라운드 작업이 끝날 때까지 기다린다 (테스트용).
 */
export function waitForIdleSheetTitleJobs(): Promise<void> {
  if (activeJobCount === 0 && queuedJobIds.length === 0 && pendingJobs.size === 0) {
    return Promise.resolve();
  }
  return new Promise((resolve) => {
    idleResolvers.push(resolve);
  });
}

/**
 * 테스트 격리를 위해 모든 작업과 extractor 오버라이드를 초기화한다.
 */
export function resetSheetTitleJobs(): void {
  for (const job of pendingJobs.values()) {
    job.cancelled = true;
    job.controller.abort();
  }
  pendingJobs.clear();
  queuedJobIds.length = 0;
  defaultExtractorOverride = null;
  notifyIfIdle();
}
