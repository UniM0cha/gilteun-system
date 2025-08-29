import type { Config } from 'drizzle-kit';

export default {
  schema: './electron/server/database/schema.ts',
  out: './electron/server/database/migrations',
  driver: 'better-sqlite',
  dbCredentials: {
    url: './gilteun-system.db',
  },
  verbose: true,
  strict: true,
} satisfies Config;
