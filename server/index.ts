import express from 'express';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import cors from 'cors';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';
import { config } from './config.js';
import { setupDatabase } from './db/setup.js';
import { registerRoutes } from "./routes";
import { initSocket } from "./socket";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function getLocalIP(): string {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name] || []) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return 'localhost';
}

// DB 테이블 생성
setupDatabase();

const app = express();
const httpServer = createServer(app);

// Middleware
app.use(cors());
app.use(express.json());

// Static files for uploads (이미지 파일명이 nanoid 기반이라 immutable 캐싱 안전)
app.use('/uploads', express.static(path.join(__dirname, 'uploads'), {
  maxAge: '1y',
  immutable: true,
}));

// API routes
registerRoutes(app);

// Socket.IO
const io = new SocketIOServer(httpServer, {
  cors: { origin: '*' },
});
app.set('io', io);
initSocket(io);

// Production: serve client build
if (config.isProduction) {
  app.use(express.static(config.clientDistDir));
  app.get('{*path}', (req, res) => {
    if (!req.path.startsWith('/api') && !req.path.startsWith('/uploads') && !req.path.startsWith('/socket.io')) {
      res.sendFile(path.join(config.clientDistDir, 'index.html'));
    }
  });
}

httpServer.listen(config.port, '0.0.0.0', () => {
  const localIP = getLocalIP();
  console.log('');
  console.log('🎵 길튼 시스템 서버 시작!');
  console.log(`   로컬:    http://localhost:${config.port}`);
  console.log(`   네트워크: http://${localIP}:${config.port}`);
  console.log('');
});
