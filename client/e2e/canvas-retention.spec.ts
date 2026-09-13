import { expect, test, type Page } from "@playwright/test";
import { io } from "socket.io-client";

const pageSurface = (page: Page, id: string) => page.locator(`[data-sheet-page="${id}"]`);
const drawingCanvas = (page: Page, id: string) => pageSurface(page, id).locator("canvas");

async function openViewer(page: Page) {
  await page.addInitScript(() => {
    localStorage.setItem("gilteun-profile", JSON.stringify({ state: { currentProfileId: "profile-e2e" }, version: 0 }));
  });
  await page.goto("/worship/worship-e2e");
  await expect(pageSurface(page, "sheet-0")).toHaveAttribute("data-page-ready", "true");
  await expect(pageSurface(page, "sheet-0")).toBeVisible();
}

async function navigate(page: Page, direction: "next" | "previous", target: string) {
  await page.getByRole("button", { name: direction === "next" ? "다음 페이지" : "이전 페이지", exact: true }).click();
  await expect(pageSurface(page, target)).toHaveAttribute("data-page-active", "true");
  await expect(pageSurface(page, target)).toHaveAttribute("data-page-ready", "true");
}

async function alphaAt(page: Page, id: string, y = 0.4, x = 0.5) {
  return drawingCanvas(page, id).evaluate(
    (canvas: HTMLCanvasElement, point) => {
      return canvas
        .getContext("2d")!
        .getImageData(Math.floor(canvas.width * point.x), Math.floor(canvas.height * point.y), 1, 1).data[3];
    },
    { x, y },
  );
}

test("first page renders while the last image is pending, then every page prepares without navigation", async ({
  page,
}) => {
  let releaseImage: (() => void) | undefined;
  await page.route("**/uploads/sheet-9.svg", async (route) => {
    await new Promise<void>((resolve) => {
      releaseImage = resolve;
    });
    await route.continue();
  });
  await openViewer(page);
  expect(await alphaAt(page, "sheet-0")).toBeGreaterThan(0);
  await expect(page.locator('[data-page-ready="true"]')).toHaveCount(9);
  const preparation = page.getByTestId("worship-preparation");
  await expect(preparation).toHaveAttribute("role", "status");
  await expect(preparation).toHaveCount(1);
  await expect(preparation).toHaveText("악보 준비 9/10");
  await expect(pageSurface(page, "sheet-9")).toHaveAttribute("data-page-ready", "false");
  releaseImage?.();
  await expect(page.locator('[data-page-ready="true"]')).toHaveCount(10);
  await expect(preparation).toHaveCount(0);
  await expect(pageSurface(page, "sheet-0")).toHaveAttribute("data-page-active", "true");
});

test("round trips retain the same canvas and never expose an empty drawing frame", async ({ page }) => {
  let drawingGets = 0;
  page.on("request", (request) => {
    if (request.url().includes("/drawings")) drawingGets++;
  });
  await openViewer(page);
  await expect(pageSurface(page, "sheet-1")).toHaveAttribute("data-page-ready", "true");
  const first = await drawingCanvas(page, "sheet-0").elementHandle();
  const second = await drawingCanvas(page, "sheet-1").elementHandle();
  await page.evaluate(() => {
    const state = { running: true, frames: 0, blank: 0 };
    Object.assign(window, { canvasFrameProbe: state });
    const sample = () => {
      if (!state.running) return;
      for (const id of ["sheet-0", "sheet-1"]) {
        const canvas = document.querySelector<HTMLCanvasElement>(`[data-sheet-page="${id}"] canvas`)!;
        if (canvas && canvas.width && canvas.height) {
          state.frames++;
          if (
            canvas.getContext("2d")!.getImageData(Math.floor(canvas.width * 0.5), Math.floor(canvas.height * 0.4), 1, 1)
              .data[3] === 0
          )
            state.blank++;
        }
      }
      requestAnimationFrame(sample);
    };
    requestAnimationFrame(sample);
  });
  for (let i = 0; i < 4; i++) {
    await navigate(page, "next", "sheet-1");
    await navigate(page, "previous", "sheet-0");
  }
  expect(
    await first!.evaluate((canvas) => canvas === document.querySelector('[data-sheet-page="sheet-0"] canvas')),
  ).toBe(true);
  expect(
    await second!.evaluate((canvas) => canvas === document.querySelector('[data-sheet-page="sheet-1"] canvas')),
  ).toBe(true);
  const result = await page.evaluate(() => {
    const state = (window as unknown as { canvasFrameProbe: { running: boolean; frames: number; blank: number } })
      .canvasFrameProbe;
    state.running = false;
    return state;
  });
  expect(result.frames).toBeGreaterThan(10);
  expect(result.blank).toBe(0);
  expect(drawingGets).toBe(0);
  await page.screenshot({ path: test.info().outputPath("retained-viewer.png") });
});

test("changes on an inactive page update its retained canvas before returning", async ({ page }) => {
  await openViewer(page);
  await expect(pageSurface(page, "sheet-1")).toHaveAttribute("data-page-ready", "true");
  const peer = io("http://127.0.0.1:3197", { transports: ["websocket"], forceNew: true });
  await new Promise<void>((resolve) => peer.on("connect", resolve));
  const pathId = `e2e-${test.info().testId}-${Date.now()}`;
  try {
    const ack = await peer.timeout(5000).emitWithAck("drawing:end", {
      sheetId: "sheet-1",
      profileId: "profile-e2e",
      pathId,
      color: "#9333ea",
      width: 0.01,
      points: [
        { x: 0.2, y: 0.6 },
        { x: 0.8, y: 0.6 },
      ],
      isEraser: false,
      isHighlighter: false,
    });
    expect(ack.ok).toBe(true);
    await expect.poll(() => alphaAt(page, "sheet-1", 0.6)).toBeGreaterThan(0);
    await navigate(page, "next", "sheet-1");
    await navigate(page, "previous", "sheet-0");
    expect((await peer.timeout(5000).emitWithAck("drawing:delete", { sheetId: "sheet-1", pathId })).ok).toBe(true);
    await expect.poll(() => alphaAt(page, "sheet-1", 0.6)).toBe(0);
    await navigate(page, "next", "sheet-1");
    expect(await alphaAt(page, "sheet-1")).toBeGreaterThan(0);
  } finally {
    await peer.timeout(5000).emitWithAck("drawing:delete", { sheetId: "sheet-1", pathId });
    peer.disconnect();
  }
});

test("an unprepared target leaves the current page visible and can be cancelled", async ({ page }) => {
  let releaseImage: (() => void) | undefined;
  await page.route("**/uploads/sheet-2.svg", async (route) => {
    await new Promise<void>((resolve) => {
      releaseImage = resolve;
    });
    await route.continue();
  });
  await openViewer(page);
  await navigate(page, "next", "sheet-1");
  await page.getByRole("button", { name: "다음 페이지", exact: true }).click();
  await expect(page.getByTestId("worship-preparation")).toHaveText(/악보 준비 \d+\/10/);
  await expect(page.getByText("악보를 준비하고 있습니다", { exact: true })).toHaveCount(0);
  await expect(pageSurface(page, "sheet-1")).toHaveAttribute("data-page-active", "true");
  expect(await alphaAt(page, "sheet-1")).toBeGreaterThan(0);
  await page.getByRole("button", { name: "이동 취소" }).click();
  releaseImage?.();
  await expect(pageSurface(page, "sheet-2")).toHaveAttribute("data-page-ready", "true");
  await expect(pageSurface(page, "sheet-1")).toHaveAttribute("data-page-active", "true");
});

test("resize retains page identity and reconstructs the correct drawing resolution", async ({ page }) => {
  await openViewer(page);
  const first = await drawingCanvas(page, "sheet-0").elementHandle();
  await navigate(page, "next", "sheet-1");
  await page.setViewportSize({ width: 844, height: 390 });
  await expect(pageSurface(page, "sheet-1")).toHaveAttribute("data-page-ready", "true");
  // Resize can outlast the navigation bar timer; dispatching the same semantic
  // button click avoids a tap changing the toolbar layout in this resize test.
  await page.getByRole("button", { name: "이전 페이지", exact: true }).dispatchEvent("click");
  await expect(pageSurface(page, "sheet-0")).toHaveAttribute("data-page-active", "true");
  await expect.poll(() => alphaAt(page, "sheet-0")).toBeGreaterThan(0);
  expect(await first!.evaluate((canvas) => canvas.isConnected)).toBe(true);
  expect(
    await drawingCanvas(page, "sheet-0").evaluate(
      (canvas: HTMLCanvasElement) => canvas.width === Math.round(canvas.offsetWidth * devicePixelRatio),
    ),
  ).toBe(true);
});

test("all ten canvases stay ready and retain identity across distant round trips without page queries", async ({
  page,
}) => {
  let drawingGets = 0;
  const emissions: string[] = [];
  page.on("request", (request) => {
    if (request.url().includes("/drawings")) drawingGets++;
  });
  page.on("websocket", (socket) =>
    socket.on("framesent", ({ payload }) => {
      const frame = String(payload);
      if (frame.startsWith("42[")) emissions.push(JSON.parse(frame.slice(2))[0]);
    }),
  );
  await openViewer(page);
  await expect(page.locator('[data-page-ready="true"]')).toHaveCount(10);
  await expect(page.getByTestId("worship-preparation")).toHaveCount(0);
  const canvases = await page.locator("[data-sheet-page] canvas").elementHandles();
  expect(canvases).toHaveLength(10);
  const rasterBytes = await page.locator("[data-sheet-page] canvas").evaluateAll((elements) =>
    elements.reduce((sum, element) => {
      const canvas = element as HTMLCanvasElement;
      return sum + canvas.width * canvas.height * 4;
    }, 0),
  );
  const sharedBufferBytes = await page.evaluate(async () => {
    // Read the same renderer module instance as the application, not a test replica.
    const renderer = await import("/src/lib/canvasRender.ts");
    return renderer.getSharedCanvasRenderBytes() as number;
  });
  expect(rasterBytes).toBeGreaterThan(0);
  expect(sharedBufferBytes).toBeGreaterThan(0);
  await test.info().attach("canvas-pixel-memory", {
    contentType: "application/json",
    body: Buffer.from(
      JSON.stringify({
        pages: canvases.length,
        rasterBytes,
        sharedBufferBytes,
        totalBytes: rasterBytes + sharedBufferBytes,
      }),
    ),
  });
  const joinsBefore = emissions.filter((event) => event === "join:sheet").length;
  expect(joinsBefore).toBeLessThanOrEqual(1);
  expect(emissions.filter((event) => event === "drawings:subscribe")).toHaveLength(1);
  await page.evaluate(() => {
    const state = { appearances: 0 };
    Object.assign(window, { preparationProbe: state });
    new MutationObserver((records) => {
      for (const record of records)
        for (const node of record.addedNodes) {
          if (
            node instanceof Element &&
            (node.matches('[data-testid="worship-preparation"]') ||
              node.querySelector('[data-testid="worship-preparation"]'))
          )
            state.appearances++;
        }
    }).observe(document.body, { childList: true, subtree: true });
  });
  for (let i = 1; i < 10; i++) await navigate(page, "next", `sheet-${i}`);
  for (let i = 8; i >= 0; i--) await navigate(page, "previous", `sheet-${i}`);
  for (const canvas of canvases) expect(await canvas.evaluate((node) => node.isConnected)).toBe(true);
  await expect(page.locator('[data-page-ready="true"]')).toHaveCount(10);
  expect(await alphaAt(page, "sheet-3")).toBe(0);
  expect(drawingGets).toBe(0);
  expect(emissions.filter((event) => event === "join:sheet")).toHaveLength(joinsBefore);
  expect(emissions.filter((event) => event === "drawings:subscribe")).toHaveLength(1);
  await expect(page.getByTestId("worship-preparation")).toHaveCount(0);
  expect(
    await page.evaluate(
      () => (window as unknown as { preparationProbe: { appearances: number } }).preparationProbe.appearances,
    ),
  ).toBe(0);
  await page.getByRole("link", { name: "예배 목록으로", exact: true }).click();
  await expect(page.locator("[data-sheet-page]")).toHaveCount(0);
  for (const canvas of canvases) {
    expect(
      await canvas.evaluate((node) => ({ connected: node.isConnected, pixels: node.width * node.height })),
    ).toEqual({ connected: false, pixels: 0 });
  }
  expect(
    await page.evaluate(async () => {
      const renderer = await import("/src/lib/canvasRender.ts");
      return renderer.getSharedCanvasRenderBytes();
    }),
  ).toBe(0);
});

test("pen editing, undo and redo update the retained pixels and persisted paths", async ({ page, request }) => {
  await openViewer(page);
  const before = (await (await request.get("/api/sheets/sheet-0/drawings")).json()) as { id: string }[];
  await page.getByRole("button", { name: "그리기 시작", exact: true }).click();
  const canvas = drawingCanvas(page, "sheet-0");
  const bounds = (await canvas.boundingBox())!;
  await page.mouse.move(bounds.x + bounds.width * 0.2, bounds.y + bounds.height * 0.7);
  await page.mouse.down();
  await page.mouse.move(bounds.x + bounds.width * 0.8, bounds.y + bounds.height * 0.7, { steps: 12 });
  await page.mouse.up();
  try {
    await expect.poll(() => alphaAt(page, "sheet-0", 0.7)).toBeGreaterThan(0);
    await expect
      .poll(async () => (await (await request.get("/api/sheets/sheet-0/drawings")).json()).length)
      .toBe(before.length + 1);
    await page.getByRole("button", { name: "되돌리기", exact: true }).click();
    await expect.poll(() => alphaAt(page, "sheet-0", 0.7)).toBe(0);
    await page.getByRole("button", { name: "다시실행", exact: true }).click();
    await expect.poll(() => alphaAt(page, "sheet-0", 0.7)).toBeGreaterThan(0);
    await page.getByRole("button", { name: "그리기 종료", exact: true }).click();
    await navigate(page, "next", "sheet-1");
    await navigate(page, "previous", "sheet-0");
    expect(await alphaAt(page, "sheet-0", 0.7)).toBeGreaterThan(0);
  } finally {
    const after = (await (await request.get("/api/sheets/sheet-0/drawings")).json()) as { id: string }[];
    const peer = io("http://127.0.0.1:3197", { transports: ["websocket"], forceNew: true });
    await new Promise<void>((resolve) => peer.on("connect", resolve));
    for (const path of after.filter((path) => !before.some((existing) => existing.id === path.id))) {
      await peer.timeout(5000).emitWithAck("drawing:delete", { sheetId: "sheet-0", pathId: path.id });
    }
    peer.disconnect();
  }
});

test("pointer swipes retain the incoming page when a transition is interrupted", async ({ page }) => {
  await openViewer(page);
  await expect(pageSurface(page, "sheet-1")).toHaveAttribute("data-page-ready", "true");
  const first = await drawingCanvas(page, "sheet-0").elementHandle();
  const bounds = (await drawingCanvas(page, "sheet-0").boundingBox())!;
  const y = bounds.y + bounds.height * 0.55;
  await page.mouse.move(bounds.x + bounds.width * 0.8, y);
  await page.mouse.down();
  await page.mouse.move(bounds.x + bounds.width * 0.2, y, { steps: 5 });
  await page.mouse.up();
  // A second gesture starts before the 240ms commit animation has finished.
  await page.mouse.move(bounds.x + bounds.width * 0.25, y);
  await page.mouse.down();
  await page.mouse.move(bounds.x + bounds.width * 0.9, y, { steps: 5 });
  await page.mouse.up();
  await expect(pageSurface(page, "sheet-0")).toHaveAttribute("data-page-active", "true");
  expect(await first!.evaluate((canvas) => canvas.isConnected)).toBe(true);
  expect(await alphaAt(page, "sheet-0")).toBeGreaterThan(0);
});

test("a new swipe wins over an older loading target", async ({ page }) => {
  let releaseImage: (() => void) | undefined;
  await page.route("**/uploads/sheet-2.svg", async (route) => {
    await new Promise<void>((resolve) => {
      releaseImage = resolve;
    });
    await route.continue();
  });
  await openViewer(page);
  await navigate(page, "next", "sheet-1");
  await page.getByRole("button", { name: "다음 페이지", exact: true }).click();
  await expect(page.getByRole("button", { name: "이동 취소" })).toBeVisible();
  const bounds = (await drawingCanvas(page, "sheet-1").boundingBox())!;
  const y = bounds.y + bounds.height * 0.55;
  await page.mouse.move(bounds.x + bounds.width * 0.2, y);
  await page.mouse.down();
  await page.mouse.move(bounds.x + bounds.width * 0.85, y, { steps: 5 });
  await page.mouse.up();
  releaseImage?.();
  await expect(pageSurface(page, "sheet-0")).toHaveAttribute("data-page-active", "true");
  // Verify after both the image and either queued transition could have finished.
  await expect(page.getByRole("button", { name: "이동 취소" })).toHaveCount(0);
  await page.waitForTimeout(500);
  await expect(pageSurface(page, "sheet-0")).toHaveAttribute("data-page-active", "true");
});

test("a broken first image does not block other pages", async ({ page }) => {
  await page.route("**/uploads/sheet-0.svg", (route) => route.abort());
  await page.addInitScript(() => {
    localStorage.setItem("gilteun-profile", JSON.stringify({ state: { currentProfileId: "profile-e2e" }, version: 0 }));
  });
  await page.goto("/worship/worship-e2e");
  await expect(page.getByTestId("worship-preparation")).toHaveAttribute("role", "alert");
  await expect(page.getByText("일부 악보를 불러오지 못했습니다", { exact: true })).toBeVisible();
  await navigate(page, "next", "sheet-1");
  expect(await alphaAt(page, "sheet-1")).toBeGreaterThan(0);
});

test("highlighter overlap, erasing and deletion preserve the correct composite pixels", async ({ page }) => {
  await openViewer(page);
  const peer = io("http://127.0.0.1:3197", { transports: ["websocket"], forceNew: true });
  await new Promise<void>((resolve) => peer.on("connect", resolve));
  const profileId = `highlight-${Date.now()}`;
  const draw = (pathId: string, isEraser = false) =>
    peer.timeout(5000).emitWithAck("drawing:end", {
      sheetId: "sheet-0",
      profileId,
      pathId,
      color: "#fde047",
      width: 0.04,
      points: [
        { x: 0.2, y: 0.65 },
        { x: 0.8, y: 0.65 },
        { x: 0.2, y: 0.65 },
      ],
      isEraser,
      isHighlighter: !isEraser,
    });
  const first = `${profileId}-1`,
    second = `${profileId}-2`,
    eraser = `${profileId}-eraser`;
  try {
    await draw(first);
    await expect.poll(() => alphaAt(page, "sheet-0", 0.65)).toBeGreaterThan(80);
    expect(await alphaAt(page, "sheet-0", 0.65)).toBeLessThan(100);
    await draw(second);
    await expect.poll(() => alphaAt(page, "sheet-0", 0.65)).toBeGreaterThan(140);
    expect(await alphaAt(page, "sheet-0", 0.65)).toBeLessThan(155);
    await draw(eraser, true);
    await expect.poll(() => alphaAt(page, "sheet-0", 0.65)).toBe(0);
    await peer.timeout(5000).emitWithAck("drawing:delete", { sheetId: "sheet-0", pathId: eraser });
    await expect.poll(() => alphaAt(page, "sheet-0", 0.65)).toBeGreaterThan(140);
    await peer.timeout(5000).emitWithAck("drawing:delete", { sheetId: "sheet-0", pathId: second });
    await expect.poll(() => alphaAt(page, "sheet-0", 0.65)).toBeLessThan(100);
    expect(await alphaAt(page, "sheet-0", 0.65)).toBeGreaterThan(80);
  } finally {
    await peer.timeout(5000).emitWithAck("drawing:clear", { sheetId: "sheet-0", profileId });
    peer.disconnect();
  }
});

test("leaving a page with the pointer down cancels its stroke before showing the next page", async ({
  page,
  request,
}) => {
  await openViewer(page);
  await expect(pageSurface(page, "sheet-1")).toHaveAttribute("data-page-ready", "true");
  const before = (await (await request.get("/api/sheets/sheet-0/drawings")).json()) as { id: string }[];
  const peer = io("http://127.0.0.1:3197", { transports: ["websocket"], forceNew: true });
  await new Promise<void>((resolve) => peer.on("connect", resolve));
  peer.emit("join:sheet", { sheetId: "sheet-0", withState: false });
  const cancelled: { sheetId: string }[] = [];
  peer.on("drawing:cancelled", (event) => cancelled.push(event));
  try {
    await page.getByRole("button", { name: "그리기 시작", exact: true }).click();
    const bounds = (await drawingCanvas(page, "sheet-0").boundingBox())!;
    await page.mouse.move(bounds.x + bounds.width * 0.2, bounds.y + bounds.height * 0.75);
    await page.mouse.down();
    await page.mouse.move(bounds.x + bounds.width * 0.7, bounds.y + bounds.height * 0.75, { steps: 8 });
    await page.getByRole("button", { name: "다음 페이지", exact: true }).dispatchEvent("click");
    await expect(pageSurface(page, "sheet-1")).toHaveAttribute("data-page-active", "true");
    await page.mouse.up();
    await expect.poll(() => cancelled.length).toBe(1);
    expect(cancelled[0].sheetId).toBe("sheet-0");
    expect((await (await request.get("/api/sheets/sheet-0/drawings")).json()).length).toBe(before.length);
    expect(await alphaAt(page, "sheet-1", 0.75)).toBe(0);
  } finally {
    await page.mouse.up();
    peer.disconnect();
  }
});

test("reconnection refreshes inactive pages without clearing the retained current image", async ({ page }) => {
  await openViewer(page);
  await expect(pageSurface(page, "sheet-1")).toHaveAttribute("data-page-ready", "true");
  const peer = io("http://127.0.0.1:3197", { transports: ["websocket"], forceNew: true });
  await new Promise<void>((resolve) => peer.on("connect", resolve));
  const pathId = `reconnect-${Date.now()}`;
  try {
    await peer.timeout(5000).emitWithAck("drawing:end", {
      sheetId: "sheet-1",
      profileId: "profile-e2e",
      pathId,
      color: "#00f",
      width: 0.01,
      points: [
        { x: 0.2, y: 0.8 },
        { x: 0.8, y: 0.8 },
      ],
      isEraser: false,
      isHighlighter: false,
    });
    await expect.poll(() => alphaAt(page, "sheet-1", 0.8)).toBeGreaterThan(0);
    await page.evaluate(() => (window as unknown as { __socket: { disconnect(): void } }).__socket.disconnect());
    await peer.timeout(5000).emitWithAck("drawing:delete", { sheetId: "sheet-1", pathId });
    expect(await alphaAt(page, "sheet-0")).toBeGreaterThan(0);
    expect(await alphaAt(page, "sheet-1", 0.8)).toBeGreaterThan(0);
    await page.evaluate(() => (window as unknown as { __socket: { connect(): void } }).__socket.connect());
    await expect.poll(() => alphaAt(page, "sheet-1", 0.8)).toBe(0);
    expect(await alphaAt(page, "sheet-0")).toBeGreaterThan(0);
  } finally {
    await peer.timeout(5000).emitWithAck("drawing:delete", { sheetId: "sheet-1", pathId });
    peer.disconnect();
  }
});

test("three viewers share an unfinished stroke on page four without moving their current pages", async ({
  page,
  context,
  request,
}) => {
  await openViewer(page);
  await expect(pageSurface(page, "sheet-3")).toHaveAttribute("data-page-ready", "true");
  const author = await context.newPage();
  const newcomer = await context.newPage();
  await openViewer(author);
  for (let i = 1; i <= 3; i++) await navigate(author, "next", `sheet-${i}`);
  const before = (await (await request.get("/api/sheets/sheet-3/drawings")).json()) as { id: string }[];
  try {
    await author.getByRole("button", { name: "그리기 시작", exact: true }).click();
    const bounds = (await drawingCanvas(author, "sheet-3").boundingBox())!;
    const y = bounds.y + bounds.height * 0.6;
    await author.mouse.move(bounds.x + bounds.width * 0.2, y);
    await author.mouse.down();
    await author.mouse.move(bounds.x + bounds.width * 0.45, y, { steps: 8 });
    await expect.poll(() => alphaAt(page, "sheet-3", 0.6, 0.3)).toBeGreaterThan(0);
    // Join only after the first part is visible: the newcomer must recover it
    // from the worship snapshot, not from a subsequent point event.
    await openViewer(newcomer);
    await expect.poll(() => alphaAt(newcomer, "sheet-3", 0.6, 0.3)).toBeGreaterThan(0);
    await author.mouse.move(bounds.x + bounds.width * 0.8, y, { steps: 8 });
    for (const viewer of [page, newcomer]) {
      await expect.poll(() => alphaAt(viewer, "sheet-3", 0.6, 0.65)).toBeGreaterThan(0);
      await expect(pageSurface(viewer, "sheet-0")).toHaveAttribute("data-page-active", "true");
    }
    await expect(pageSurface(author, "sheet-3")).toHaveAttribute("data-page-active", "true");
    await author.mouse.up();
    await expect
      .poll(async () => (await (await request.get("/api/sheets/sheet-3/drawings")).json()).length)
      .toBe(before.length + 1);
    for (const viewer of [page, newcomer]) {
      expect(await alphaAt(viewer, "sheet-3", 0.6, 0.3)).toBeGreaterThan(0);
      expect(await alphaAt(viewer, "sheet-3", 0.6, 0.65)).toBeGreaterThan(0);
    }
  } finally {
    await author.mouse.up();
    await author.close();
    await newcomer.close();
    const after = (await (await request.get("/api/sheets/sheet-3/drawings")).json()) as { id: string }[];
    const peer = io("http://127.0.0.1:3197", { transports: ["websocket"], forceNew: true });
    await new Promise<void>((resolve) => peer.on("connect", resolve));
    try {
      for (const path of after.filter((path) => !before.some((existing) => existing.id === path.id))) {
        await peer.timeout(5000).emitWithAck("drawing:delete", { sheetId: "sheet-3", pathId: path.id });
      }
    } finally {
      peer.disconnect();
    }
  }
});

test("completing a remote highlighter replaces its unfinished pixels without increasing alpha", async ({ page }) => {
  await openViewer(page);
  await expect(pageSurface(page, "sheet-3")).toHaveAttribute("data-page-ready", "true");
  const peer = io("http://127.0.0.1:3197", { transports: ["websocket"], forceNew: true });
  await new Promise<void>((resolve) => peer.on("connect", resolve));
  const pathId = `progress-highlighter-${Date.now()}`;
  const stroke = {
    sheetId: "sheet-3",
    pathId,
    profileId: "profile-e2e",
    color: "#fde047",
    width: 0.04,
    isEraser: false,
    isHighlighter: true,
  };
  const points = [
    { x: 0.2, y: 0.65 },
    { x: 0.8, y: 0.65 },
    { x: 0.2, y: 0.65 },
  ];
  try {
    peer.emit("drawing:start", { ...stroke, point: points[0] });
    for (const point of points.slice(1)) peer.emit("drawing:move", { sheetId: stroke.sheetId, pathId, point });
    await expect.poll(() => alphaAt(page, "sheet-3", 0.65)).toBeGreaterThan(80);
    expect(await alphaAt(page, "sheet-3", 0.65)).toBeLessThan(100);
    await page.evaluate(() => {
      const state = { seen: false };
      Object.assign(window, { highlighterCompletion: state });
      const socket = (window as unknown as { __socket: { once(event: string, listener: () => void): void } }).__socket;
      socket.once("drawing:ended", () => {
        state.seen = true;
      });
    });
    expect((await peer.timeout(5000).emitWithAck("drawing:end", { ...stroke, points })).ok).toBe(true);
    await expect
      .poll(() =>
        page.evaluate(
          () => (window as unknown as { highlighterCompletion: { seen: boolean } }).highlighterCompletion.seen,
        ),
      )
      .toBe(true);
    await page.evaluate(
      () => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))),
    );
    expect(await alphaAt(page, "sheet-3", 0.65)).toBeGreaterThan(80);
    expect(await alphaAt(page, "sheet-3", 0.65)).toBeLessThan(100);
    // Deletion is an ordered server round trip after completion. If a temporary
    // copy survived completion, deleting the saved path would leave its pixels.
    await peer.timeout(5000).emitWithAck("drawing:delete", { sheetId: stroke.sheetId, pathId });
    await expect.poll(() => alphaAt(page, "sheet-3", 0.65)).toBe(0);
    await expect(pageSurface(page, "sheet-0")).toHaveAttribute("data-page-active", "true");
  } finally {
    await peer.timeout(5000).emitWithAck("drawing:delete", { sheetId: stroke.sheetId, pathId });
    peer.disconnect();
  }
});

test("a disconnected author's unfinished stroke disappears from an inactive canvas", async ({ page, request }) => {
  await openViewer(page);
  await expect(pageSurface(page, "sheet-3")).toHaveAttribute("data-page-ready", "true");
  const peer = io("http://127.0.0.1:3197", { transports: ["websocket"], forceNew: true });
  await new Promise<void>((resolve) => peer.on("connect", resolve));
  const pathId = `disconnect-progress-${Date.now()}`;
  try {
    peer.emit("drawing:start", {
      sheetId: "sheet-3",
      pathId,
      profileId: "profile-e2e",
      color: "#ef4444",
      width: 0.01,
      point: { x: 0.2, y: 0.75 },
      isEraser: false,
      isHighlighter: false,
    });
    peer.emit("drawing:move", { sheetId: "sheet-3", pathId, point: { x: 0.8, y: 0.75 } });
    await expect.poll(() => alphaAt(page, "sheet-3", 0.75)).toBeGreaterThan(0);
    peer.disconnect();
    await expect.poll(() => alphaAt(page, "sheet-3", 0.75)).toBe(0);
    await expect(pageSurface(page, "sheet-0")).toHaveAttribute("data-page-active", "true");
    const saved = (await (await request.get("/api/sheets/sheet-3/drawings")).json()) as { id: string }[];
    expect(saved.some((path) => path.id === pathId)).toBe(false);
  } finally {
    peer.disconnect();
  }
});
