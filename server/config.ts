import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const config = {
  port: parseInt(process.env.PORT || "3002", 10),
  dbPath: process.env.DB_PATH || path.join(__dirname, "data", "gilteun.db"),
  uploadsDir: process.env.UPLOADS_DIR || path.join(__dirname, "uploads"),
  clientDistDir: path.join(__dirname, "..", "client", "dist"),
  isProduction: process.env.NODE_ENV === "production",
  authPin: process.env.AUTH_PIN || null,
};
