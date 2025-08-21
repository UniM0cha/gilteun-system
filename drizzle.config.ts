import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/server/database/schema.ts',
  out: './drizzle',
  dialect: 'sqlite',
  dbCredentials: {
    url: './gilteun-system.db',
  },
  verbose: true,
  strict: true,
});