import { Express } from 'express';
import worshipTypesRouter from './worshipTypes.js';
import worshipsRouter from './worships.js';
import sheetsRouter from './sheets.js';
import profilesRouter from './profiles.js';
import rolesRouter from './roles.js';
import commandsRouter from './commands.js';

export function registerRoutes(app: Express): void {
  app.use('/api/worship-types', worshipTypesRouter);
  app.use('/api/worships', worshipsRouter);
  app.use('/api', sheetsRouter); // sheets 라우트는 /api/worships/:id/sheets와 /api/sheets/:id 혼합
  app.use('/api/profiles', profilesRouter);
  app.use('/api/roles', rolesRouter);
  app.use('/api/commands', commandsRouter);
}
