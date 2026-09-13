// @vitest-environment happy-dom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Sheet } from "../types";
import type { DrawingPath } from "../hooks/useDrawingSync";

const fake = vi.hoisted(() => {
  const listeners = new Map<string, Set<(...args: unknown[]) => void>>();
  const emissions: { event: string; args: unknown[] }[] = [];
  return {
    connected: true,
    emissions,
    on(event: string, listener: (...args: unknown[]) => void) {
      if (!listeners.has(event)) listeners.set(event, new Set());
      listeners.get(event)!.add(listener);
    },
    off(event: string, listener: (...args: unknown[]) => void) {
      listeners.get(event)?.delete(listener);
    },
    emit(event: string, ...args: unknown[]) {
      emissions.push({ event, args });
    },
    receive(event: string, ...args: unknown[]) {
      listeners.get(event)?.forEach((listener) => listener(...args));
    },
    reset() {
      listeners.clear();
      emissions.length = 0;
      this.connected = true;
    },
  };
});

vi.mock("../hooks/useSocket", () => ({ getSocket: () => fake }));
vi.mock("sonner", () => ({ toast: { error: vi.fn() } }));
import { useDrawingSync } from "../hooks/useDrawingSync";
import { queryKeys } from "./queryKeys";

type Options = Parameters<typeof useDrawingSync>[0];
let current: ReturnType<typeof useDrawingSync>;
let root: Root;
let client: QueryClient;
let options: Options;
const renders: { sheetId: string | null; remote: number }[] = [];

function sheet(id: string, worshipId = "worship"): Sheet {
  return { id, worshipId, fileName: id, title: id, imagePath: id, order: 0, createdAt: "2026-09-13" };
}
function path(id: string, sheetId = "one"): DrawingPath {
  return {
    id,
    sheetId,
    profileId: "me",
    color: "#f00",
    width: 0.01,
    points: [{ x: 0.2, y: 0.3 }],
    isEraser: false,
    isHighlighter: false,
  };
}
function Harness() {
  current = useDrawingSync(options);
  renders.push({ sheetId: options.sheetId, remote: current.remoteInProgress.length });
  return null;
}
async function render(updates: Partial<Options> = {}) {
  options = { ...options, ...updates };
  await act(async () =>
    root.render(
      <QueryClientProvider client={client}>
        <Harness />
      </QueryClientProvider>,
    ),
  );
}
function last<T>(event: string): T {
  const matching = fake.emissions.filter((item) => item.event === event);
  const emission = matching[matching.length - 1];
  if (!emission) throw new Error(`No ${event} request`);
  return emission.args[0] as T;
}
async function page(paths: DrawingPath[] = []) {
  const request = last<{ sheetId: string; requestId: string }>("join:sheet");
  await act(async () => fake.receive("drawing:state", { ...request, paths }));
}
async function bulk(pages: { sheetId: string; paths: DrawingPath[] }[]) {
  const request = last<{ worshipId: string; subscriptionId: string }>("drawings:subscribe");
  await act(async () => fake.receive("drawings:state", { ...request, sheets: pages }));
}

beforeEach(() => {
  fake.reset();
  renders.length = 0;
  (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  root = createRoot(document.createElement("div"));
  options = {
    sheetId: "one",
    worshipId: "worship",
    sheets: [sheet("one"), sheet("two")],
    profileId: "me",
    enabled: true,
  };
});
afterEach(async () => {
  await act(async () => root.unmount());
  client.clear();
  vi.restoreAllMocks();
});

describe("useDrawingSync session lifecycle", () => {
  it("has its listeners installed before the initial page request is emitted", async () => {
    const emit = fake.emit.bind(fake);
    vi.spyOn(fake, "emit").mockImplementation((event, ...args) => {
      emit(event, ...args);
      if (event === "join:sheet") {
        fake.receive("drawing:state", { ...(args[0] as object), paths: [path("immediate")] });
      }
    });
    await render();
    expect(current.paths.map((item) => item.id)).toEqual(["immediate"]);
  });

  it("loads the first page before starting the requested background subscription", async () => {
    await render();
    expect(fake.emissions.map((item) => item.event)).toEqual(["join:sheet"]);
    await page([path("a")]);
    expect(current.paths.map((item) => item.id)).toEqual(["a"]);
    expect(current.pathsBySheet.has("two")).toBe(false);
    await render({ preloadEnabled: true });
    expect(current.bulkStatus).toBe("loading");
    await bulk([
      { sheetId: "one", paths: [path("a")] },
      { sheetId: "two", paths: [] },
    ]);
    expect(current.bulkStatus).toBe("ready");
    expect(current.pathsBySheet.get("two")).toEqual([]);
  });

  it("preserves completed drawings during page round trips and rejects an old page response", async () => {
    await render({ preloadEnabled: true });
    await bulk([
      { sheetId: "one", paths: [path("a")] },
      { sheetId: "two", paths: [path("b", "two")] },
    ]);
    const oldRequest = last<{ sheetId: string; requestId: string }>("join:sheet");
    const first = current.paths;
    await render({ sheetId: "two" });
    expect(current.paths.map((item) => item.id)).toEqual(["b"]);
    expect(last<{ withState: boolean }>("join:sheet").withState).toBe(false);
    await render({ sheetId: "one" });
    expect(current.paths).toBe(first);
    expect(last<{ withState: boolean }>("join:sheet").withState).toBe(false);
    await act(async () => fake.receive("drawing:state", { ...oldRequest, paths: [] }));
    expect(current.paths).toBe(first);
    await page([path("a")]);
    expect(current.paths).toBe(first);
  });

  it("receives a remote edit for an inactive page before revisiting", async () => {
    await render({ preloadEnabled: true });
    await bulk([
      { sheetId: "one", paths: [] },
      { sheetId: "two", paths: [] },
    ]);
    await act(async () => fake.receive("drawing:ended", { ...path("peer", "two"), pathId: "peer" }));
    expect(current.pathsBySheet.get("two")?.map((item) => item.id)).toEqual(["peer"]);
    await render({ sheetId: "two" });
    expect(current.paths.map((item) => item.id)).toEqual(["peer"]);
    await render({ sheetId: "one" });
    await act(async () => fake.receive("drawing:deleted", { sheetId: "two", pathId: "peer" }));
    expect(current.pathsBySheet.get("two")).toEqual([]);
  });

  it("overlays optimistic edits over incoming snapshots and rolls a failed ack back", async () => {
    await render();
    await page([path("a")]);
    await act(async () => current.deletePath("a"));
    await page([path("a")]);
    expect(current.paths).toEqual([]);
    const ack = fake.emissions.find((item) => item.event === "drawing:delete")!.args[1] as (value: unknown) => void;
    await act(async () => ack({ ok: false, sheetId: "one", error: "save failed" }));
    expect(current.paths.map((item) => item.id)).toEqual(["a"]);
  });

  it("reconciles ambiguous edits after reconnect without emitting mutation retries", async () => {
    await render({ preloadEnabled: true });
    await bulk([
      { sheetId: "one", paths: [path("a")] },
      { sheetId: "two", paths: [] },
    ]);
    await act(async () => current.deletePath("a"));
    const oldRequest = last<{ worshipId: string; subscriptionId: string }>("drawings:subscribe");
    await act(async () => {
      fake.connected = false;
      fake.receive("disconnect");
    });
    await act(async () => {
      fake.connected = true;
      fake.receive("connect");
    });
    expect(last<{ withState: boolean }>("join:sheet").withState).toBe(true);
    expect(fake.emissions.filter((item) => item.event === "drawing:delete")).toHaveLength(1);
    await act(async () => current.addPath(path("new")));
    await act(async () => fake.receive("drawings:state", { ...oldRequest, sheets: [{ sheetId: "one", paths: [] }] }));
    expect(current.paths.map((item) => item.id)).toEqual(["new"]);
    await bulk([
      { sheetId: "one", paths: [path("a")] },
      { sheetId: "two", paths: [] },
    ]);
    expect(current.paths.map((item) => item.id)).toEqual(["a", "new"]);
  });

  it("shows a first-page load failure and retries its own request even before bulk is enabled", async () => {
    await render();
    const original = last<{ sheetId: string; requestId: string }>("join:sheet");
    await act(async () => fake.receive("drawing:error", { ...original, error: "query failed" }));
    expect(current.loadError).toBeTruthy();
    await act(async () => current.retryLoad());
    expect(last<{ requestId: string }>("join:sheet").requestId).not.toBe(original.requestId);
    expect(fake.emissions.filter((item) => item.event === "drawings:subscribe")).toHaveLength(0);
    await page([]);
    expect(current.loadError).toBeNull();
    expect(current.pathsBySheet.get("one")).toEqual([]);
  });

  it("ignores obsolete subscriptions and old worship responses", async () => {
    await render({ preloadEnabled: true });
    const old = last<{ worshipId: string; subscriptionId: string }>("drawings:subscribe");
    await render({ worshipId: "next", sheetId: "next-page", sheets: [sheet("next-page", "next")] });
    await act(async () =>
      fake.receive("drawings:state", { ...old, sheets: [{ sheetId: "one", paths: [path("old")] }] }),
    );
    expect(current.pathsBySheet.has("one")).toBe(false);
    expect(current.pathsBySheet.has("next-page")).toBe(false);
    await bulk([{ sheetId: "next-page", paths: [] }]);
    expect(current.pathsBySheet.get("next-page")).toEqual([]);
  });

  it("retries failed bulk loading and prunes pages removed from the worship", async () => {
    await render({ preloadEnabled: true });
    const original = last<{ worshipId: string; subscriptionId: string }>("drawings:subscribe");
    await act(async () => fake.receive("drawings:error", { ...original, error: "query failed" }));
    expect(current.bulkStatus).toBe("error");
    expect(current.loadError).toBeTruthy();
    await act(async () => current.retryLoad());
    expect(last<{ subscriptionId: string }>("drawings:subscribe").subscriptionId).not.toBe(original.subscriptionId);
    await bulk([
      { sheetId: "one", paths: [] },
      { sheetId: "two", paths: [path("b", "two")] },
    ]);
    await render({ sheets: [sheet("one"), sheet("three")] });
    expect(current.pathsBySheet.has("two")).toBe(false);
    expect(current.pathsBySheet.has("three")).toBe(false);
    await bulk([
      { sheetId: "one", paths: [] },
      { sheetId: "three", paths: [] },
    ]);
    expect(current.pathsBySheet.get("three")).toEqual([]);
  });

  it("never carries another page's in-progress stroke into the incoming render", async () => {
    await render();
    await page([]);
    await act(async () =>
      fake.receive("drawing:started", {
        sheetId: "one",
        pathId: "remote",
        profileId: "peer",
        color: "red",
        width: 1,
        isEraser: false,
        isHighlighter: false,
        point: { x: 0, y: 0 },
      }),
    );
    expect(current.remoteInProgress).toHaveLength(1);
    await render({ sheetId: "two" });
    expect(renders.filter((item) => item.sheetId === "two").every((item) => item.remote === 0)).toBe(true);
  });

  it("reactively seeds late HTTP cache data without overwriting confirmed page drawings", async () => {
    await render();
    await act(async () => client.setQueryData(queryKeys.drawings.bySheet("one"), [path("http")]));
    expect(current.paths.map((item) => item.id)).toEqual(["http"]);
    await page([path("server")]);
    await act(async () => client.setQueryData(queryKeys.drawings.bySheet("one"), [path("stale")]));
    expect(current.paths.map((item) => item.id)).toEqual(["server"]);
  });

  it("preserves local undo/redo and clears that history on a page transition", async () => {
    await render();
    await page([]);
    await act(async () => current.addPath(path("mine")));
    const addAck = fake.emissions.find((item) => item.event === "drawing:end")!.args[1] as (value: unknown) => void;
    await act(async () => addAck({ ok: true, sheetId: "one", path: path("mine") }));
    await act(async () => current.undo());
    expect(current.paths).toEqual([]);
    await act(async () => current.redo());
    expect(current.paths.map((item) => item.id)).toEqual(["mine"]);
    await render({ sheetId: "two" });
    await page([]);
    const count = fake.emissions.length;
    await act(async () => current.undo());
    expect(fake.emissions).toHaveLength(count);
  });
});
