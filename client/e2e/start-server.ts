// Isolated fixtures with the real server entrypoint, SQLite and Socket.IO.
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const uploads = mkdtempSync(join(tmpdir(), "gilteun-canvas-e2e-"));
process.env.PORT = "3197";
process.env.DB_PATH = ":memory:";
process.env.UPLOADS_DIR = uploads;
process.env.AUTH_PIN = "";
process.on("exit", () => rmSync(uploads, { recursive: true, force: true }));
process.on("SIGTERM", () => process.exit(0));
process.on("SIGINT", () => process.exit(0));

const { setupDatabase } = await import("../../server/db/setup.js");
const { sqlite } = await import("../../server/db/index.js");
setupDatabase();
sqlite.exec(`
  INSERT INTO worship_types VALUES ('type-e2e', '테스트', 'blue');
  INSERT INTO roles VALUES ('role-e2e', '테스트', '🎵');
  INSERT INTO profiles VALUES ('profile-e2e', '회귀 검증', 'role-e2e', 'blue');
  INSERT INTO worships VALUES ('worship-e2e', '캔버스 회귀 검증', '2026-09-13', 'type-e2e', '2026-09-13', '2026-09-13');
  CREATE TABLE IF NOT EXISTS app_meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);
  INSERT INTO app_meta VALUES ('drawing_coords_card_basis', 'e2e-card-basis');
`);
for (let i = 0; i < 12; i++) {
  writeFileSync(
    join(uploads, `sheet-${i}.svg`),
    '<svg xmlns="http://www.w3.org/2000/svg" width="600" height="800"><rect width="600" height="800" fill="white"/><path d="M40 120H560M40 150H560M40 180H560M40 210H560M40 240H560" stroke="#444" stroke-width="2"/></svg>',
  );
  sqlite
    .prepare("INSERT INTO sheets VALUES (?, ?, ?, ?, ?, ?, ?)")
    .run(`sheet-${i}`, "worship-e2e", `sheet-${i}.svg`, `악보 ${i + 1}`, `sheet-${i}.svg`, i, "2026-09-13");
  if (i !== 3)
    sqlite.prepare("INSERT INTO drawing_paths VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)").run(
      `path-${i}`,
      `sheet-${i}`,
      "profile-e2e",
      i % 2 ? "#2563eb" : "#ef4444",
      0.01,
      JSON.stringify([
        { x: 0.2, y: 0.4 },
        { x: 0.8, y: 0.4 },
      ]),
      0,
      0,
      "2026-09-13",
    );
}
await import("../../server/index.js");
