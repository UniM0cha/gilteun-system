import { describe, expect, it } from "vitest";
import { DrawingSession } from "./drawingSession";
import type { DrawingPath } from "../hooks/useDrawingSync";

function path(id: string, sheetId = "one", profileId = "me"): DrawingPath {
  return {
    id,
    sheetId,
    profileId,
    color: "#ff0000",
    width: 0.01,
    points: [{ x: 0.2, y: 0.3 }],
    isEraser: false,
    isHighlighter: false,
  };
}

function createSession() {
  const store = new DrawingSession();
  store.setSheets(["one", "two", "three"]);
  return store;
}

function ids(store: DrawingSession, sheetId = "one") {
  return store
    .getSnapshot()
    .get(sheetId)
    ?.map((item) => item.id);
}

describe("DrawingSession", () => {
  it("settles a failed add independently of a later redo with the same path ID", () => {
    const store = createSession();
    store.snapshot([{ sheetId: "one", paths: [] }]);
    const first = store.mutate("one", { kind: "add", path: path("a") })!;
    const undo = store.mutate("one", { kind: "delete", pathIds: ["a"] })!;
    const redo = store.mutate("one", { kind: "add", path: path("a") })!;
    store.acknowledge(first, { ok: false, sheetId: "one", error: "temporary failure" });
    store.acknowledge(undo, { ok: true, sheetId: "one", deletedPathIds: [] });
    store.acknowledge(redo, { ok: true, sheetId: "one", path: path("a") });
    expect(ids(store)).toEqual(["a"]);
  });

  it("distinguishes unknown pages from confirmed empty pages", () => {
    const store = createSession();
    store.remote("one", { kind: "add", path: path("partial") });
    expect(store.getSnapshot().has("one")).toBe(false);
    store.snapshot([{ sheetId: "one", paths: [] }]);
    expect(ids(store)).toEqual([]);
    expect(store.getSnapshot().has("two")).toBe(false);
  });

  it("keeps page arrays and map identity when navigation snapshots contain the same paths", () => {
    const store = createSession();
    store.snapshot([
      { sheetId: "one", paths: [path("a")] },
      { sheetId: "two", paths: [] },
    ]);
    const map = store.getSnapshot();
    const first = map.get("one");
    store.snapshot([{ sheetId: "two", paths: [] }]);
    store.snapshot([{ sheetId: "one", paths: [path("a")] }]);
    expect(store.getSnapshot()).toBe(map);
    expect(store.getSnapshot().get("one")).toBe(first);
  });

  it("receives offscreen additions/deletions while preserving unchanged page references", () => {
    const store = createSession();
    store.snapshot([
      { sheetId: "one", paths: [path("a")] },
      { sheetId: "two", paths: [] },
    ]);
    const first = store.getSnapshot().get("one");
    store.remote("two", { kind: "add", path: path("b", "two") });
    expect(ids(store, "two")).toEqual(["b"]);
    expect(store.getSnapshot().get("one")).toBe(first);
    store.remote("two", { kind: "delete", pathIds: ["b"] });
    expect(ids(store, "two")).toEqual([]);
  });

  it("overlays pending add, delete, and clear on both page and bulk snapshots", () => {
    const store = createSession();
    store.snapshot([{ sheetId: "one", paths: [path("a"), path("peer", "one", "them")] }]);
    store.mutate("one", { kind: "add", path: path("b") });
    store.mutate("one", { kind: "delete", pathIds: ["a"] });
    store.snapshot([{ sheetId: "one", paths: [path("a"), path("peer", "one", "them")] }]);
    expect(ids(store)).toEqual(["peer", "b"]);
    store.mutate("one", { kind: "clear", profileId: "me" });
    store.snapshot([
      { sheetId: "one", paths: [path("a"), path("late"), path("peer", "one", "them")] },
      { sheetId: "two", paths: [] },
    ]);
    expect(ids(store)).toEqual(["peer"]);
  });

  it("commits successful ack before removing optimistic overlays", () => {
    const store = createSession();
    store.snapshot([{ sheetId: "one", paths: [] }]);
    const operation = store.mutate("one", { kind: "add", path: path("a") })!;
    const snapshot = store.getSnapshot();
    store.acknowledge(operation, { ok: true, sheetId: "one", path: path("a") });
    expect(ids(store)).toEqual(["a"]);
    expect(store.getSnapshot()).toBe(snapshot);
    const deletion = store.mutate("one", { kind: "delete", pathIds: ["a"] })!;
    store.acknowledge(deletion, { ok: true, sheetId: "one", deletedPathIds: ["a"] });
    expect(ids(store)).toEqual([]);
  });

  it("rolls failures back against latest confirmed data without undoing peer edits", () => {
    const store = createSession();
    store.snapshot([{ sheetId: "one", paths: [path("a")] }]);
    const deletion = store.mutate("one", { kind: "delete", pathIds: ["a"] })!;
    store.remote("one", { kind: "add", path: path("b", "one", "them") });
    store.acknowledge(deletion, { ok: false, sheetId: "one", error: "write failed" });
    expect(ids(store)).toEqual(["a", "b"]);
    const clearing = store.mutate("one", { kind: "clear", profileId: "me" })!;
    store.remote("one", { kind: "delete", pathIds: ["a"] });
    store.acknowledge(clearing, { ok: false, sheetId: "one", error: "write failed" });
    expect(ids(store)).toEqual(["b"]);
  });

  it("uses exact server clear results and preserves later local additions", () => {
    const store = createSession();
    store.snapshot([{ sheetId: "one", paths: [path("a"), path("peer", "one", "them")] }]);
    const clear = store.mutate("one", { kind: "clear", profileId: "me" })!;
    store.mutate("one", { kind: "add", path: path("new") });
    store.acknowledge(clear, { ok: true, sheetId: "one", deletedPathIds: ["a"] });
    expect(ids(store)).toEqual(["peer", "new"]);
  });

  it("rejects an optimistic ID collision without deleting its confirmed server row", () => {
    const store = createSession();
    const canonical = { ...path("same"), color: "#0000ff" };
    store.snapshot([{ sheetId: "one", paths: [canonical] }]);
    const operation = store.mutate("one", { kind: "add", path: path("same") })!;
    expect(store.getSnapshot().get("one")![0].color).toBe("#ff0000");
    store.acknowledge(operation, { ok: false, sheetId: "one", error: "conflict" });
    expect(store.getSnapshot().get("one")).toEqual([canonical]);
  });

  it("reconciles uncertain pre-reconnect operations while preserving post-request edits", () => {
    const store = createSession();
    store.snapshot([{ sheetId: "one", paths: [path("a")] }]);
    store.mutate("one", { kind: "delete", pathIds: ["a"] });
    store.mutate("one", { kind: "add", path: path("uncertain") });
    const checkpoint = store.checkpoint();
    store.mutate("one", { kind: "add", path: path("new") });
    store.snapshot([{ sheetId: "one", paths: [path("a")] }], checkpoint);
    expect(ids(store)).toEqual(["a", "new"]);
  });

  it("does not clear uncertain operations for pages missing from the reconnect snapshot", () => {
    const store = createSession();
    store.snapshot([
      { sheetId: "one", paths: [] },
      { sheetId: "two", paths: [] },
    ]);
    store.mutate("two", { kind: "add", path: path("queued", "two") });
    store.snapshot([{ sheetId: "one", paths: [] }], store.checkpoint());
    expect(ids(store, "two")).toEqual(["queued"]);
  });

  it("never lets late HTTP cache results overwrite live vectors or pending changes", () => {
    const store = createSession();
    store.seedPage("one", [path("a")]);
    store.mutate("one", { kind: "delete", pathIds: ["a"] });
    store.seedPage("one", [path("a"), path("stale")]);
    expect(ids(store)).toEqual([]);
    store.snapshot([{ sheetId: "one", paths: [path("server")] }]);
    store.seedPage("one", [path("a")]);
    expect(ids(store)).toEqual(["server"]);
  });

  it("prunes removed pages and ignores their late acknowledgements", () => {
    const store = createSession();
    store.snapshot([{ sheetId: "one", paths: [path("a")] }]);
    const operation = store.mutate("one", { kind: "add", path: path("b") })!;
    store.setSheets(["two"]);
    store.acknowledge(operation, { ok: true, sheetId: "one", path: path("b") });
    store.snapshot([{ sheetId: "one", paths: [path("a")] }]);
    expect(store.getSnapshot().has("one")).toBe(false);
    expect(store.mutate("one", { kind: "add", path: path("c") })).toBeNull();
  });
});
