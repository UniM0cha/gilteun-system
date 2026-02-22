import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const config = {
  port: parseInt(process.env.PORT || '3001', 10),
  dbPath: path.join(__dirname, 'data', 'gilteun.db'),
  uploadsDir: path.join(__dirname, 'uploads'),
  clientDistDir: path.join(__dirname, '..', 'client', 'dist'),
  isProduction: process.env.NODE_ENV === 'production',
};
