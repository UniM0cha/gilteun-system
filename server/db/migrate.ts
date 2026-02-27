import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import * as schema from "./schema.js";
import { config } from "../config.js";
import fs from "fs";
import path from "path";

const dataDir = path.dirname(config.dbPath);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const sqlite = new Database(config.dbPath);
sqlite.pragma("journal_mode = WAL");

const db = drizzle(sqlite, { schema });
migrate(db, { migrationsFolder: "./drizzle" });

console.log("Migration completed!");
sqlite.close();
