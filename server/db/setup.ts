import { sqlite } from ".";

export function setupDatabase(): void {
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS worship_types (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      color TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS roles (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      icon TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS profiles (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      role_id TEXT NOT NULL REFERENCES roles(id),
      color TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS commands (
      id TEXT PRIMARY KEY,
      emoji TEXT NOT NULL,
      label TEXT NOT NULL,
      is_default INTEGER NOT NULL DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS worships (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      date TEXT NOT NULL,
      type_id TEXT NOT NULL REFERENCES worship_types(id),
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS sheets (
      id TEXT PRIMARY KEY,
      worship_id TEXT NOT NULL REFERENCES worships(id),
      file_name TEXT NOT NULL,
      title TEXT NOT NULL,
      image_path TEXT NOT NULL,
      "order" INTEGER NOT NULL,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS drawing_paths (
      id TEXT PRIMARY KEY,
      sheet_id TEXT NOT NULL REFERENCES sheets(id),
      profile_id TEXT,
      color TEXT NOT NULL,
      width REAL NOT NULL,
      points TEXT NOT NULL,
      is_eraser INTEGER NOT NULL DEFAULT 0,
      is_highlighter INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    );
  `);

  // 기존 DB 호환: drawing_paths에 is_highlighter 컬럼이 없으면 추가.
  // CREATE TABLE IF NOT EXISTS는 기존 테이블에 컬럼을 더하지 않고, SQLite엔 ADD COLUMN IF NOT EXISTS가
  // 없으므로 PRAGMA로 존재 여부를 확인해 멱등성을 보장한다(중복 실행 시 "duplicate column" 방지).
  const drawingCols = sqlite.prepare(`PRAGMA table_info(drawing_paths)`).all() as { name: string }[];
  if (!drawingCols.some((c) => c.name === "is_highlighter")) {
    sqlite.exec(`ALTER TABLE drawing_paths ADD COLUMN is_highlighter INTEGER NOT NULL DEFAULT 0`);
  }
}
