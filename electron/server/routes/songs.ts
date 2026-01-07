// 찬양 라우터

import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { app } from 'electron';
import { SongService } from '../services/SongService.js';
import type { SongTable } from '../database/types.js';

// snake_case → camelCase 변환 유틸리티
interface SongResponse {
  id: string;
  worshipId: string;
  title: string;
  key: string | null;
  memo: string | null;
  imagePath: string | null;
  orderIndex: number;
  createdAt: string;
  updatedAt: string;
}

function toSongResponse(song: SongTable): SongResponse {
  return {
    id: song.id,
    worshipId: song.worship_id,
    title: song.title,
    key: song.key,
    memo: song.memo,
    imagePath: song.image_path,
    orderIndex: song.order_index,
    createdAt: song.created_at,
    updatedAt: song.updated_at,
  };
}

// 이미지 저장 경로 설정
function getUploadPath(): string {
  // Electron userData 경로 사용 (앱 데이터 저장 위치)
  const userDataPath = app?.getPath?.('userData') || process.cwd();
  const uploadPath = path.join(userDataPath, 'uploads', 'scores');

  // 디렉토리가 없으면 생성
  if (!fs.existsSync(uploadPath)) {
    fs.mkdirSync(uploadPath, { recursive: true });
  }

  return uploadPath;
}

// multer 설정
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, getUploadPath());
  },
  filename: (_req, file, cb) => {
    // 고유 파일명 생성
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, `score-${uniqueSuffix}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (_req, file, cb) => {
    // 이미지 파일만 허용
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('이미지 파일만 업로드 가능합니다.'));
    }
  },
});

export function createSongRouter(service: SongService): Router {
  const router = Router();

  // 예배별 찬양 조회
  router.get('/worship/:worshipId', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const songs = await service.getByWorshipId(req.params.worshipId);
      res.json({ success: true, data: songs.map(toSongResponse) });
    } catch (error) {
      next(error);
    }
  });

  // 찬양 순서 변경 (/:id 보다 먼저 정의해야 함)
  router.put('/worship/:worshipId/reorder', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { songIds } = req.body as { songIds: string[] };
      await service.reorder(req.params.worshipId, songIds);
      res.json({ success: true, message: '순서가 변경되었습니다.' });
    } catch (error) {
      next(error);
    }
  });

  // ID로 찬양 조회
  router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const song = await service.getById(req.params.id);
      if (!song) {
        res.status(404).json({ success: false, error: { message: '찬양을 찾을 수 없습니다.' } });
        return;
      }
      res.json({ success: true, data: toSongResponse(song) });
    } catch (error) {
      next(error);
    }
  });

  // 찬양 생성
  router.post('/', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { worshipId, title, key, memo, imagePath } = req.body as {
        worshipId: string;
        title: string;
        key?: string | null;
        memo?: string | null;
        imagePath?: string | null;
      };
      const song = await service.create({ worshipId, title, key, memo, imagePath });
      res.status(201).json({ success: true, data: toSongResponse(song) });
    } catch (error) {
      next(error);
    }
  });

  // 찬양 수정
  router.put('/:id', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { title, key, memo, imagePath, orderIndex } = req.body as {
        title?: string;
        key?: string | null;
        memo?: string | null;
        imagePath?: string | null;
        orderIndex?: number;
      };
      const song = await service.update(req.params.id, { title, key, memo, imagePath, orderIndex });
      res.json({ success: true, data: toSongResponse(song) });
    } catch (error) {
      next(error);
    }
  });

  // 찬양 삭제
  router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
    try {
      await service.delete(req.params.id);
      res.json({ success: true, message: '찬양이 삭제되었습니다.' });
    } catch (error) {
      next(error);
    }
  });

  // 악보 이미지 업로드
  router.post('/:id/image', upload.single('image'), async (req: Request, res: Response, next: NextFunction) => {
    try {
      const file = req.file;
      if (!file) {
        res.status(400).json({ success: false, error: { message: '이미지 파일이 필요합니다.' } });
        return;
      }

      // 기존 찬양 조회
      const song = await service.getById(req.params.id);
      if (!song) {
        // 업로드된 파일 삭제
        fs.unlinkSync(file.path);
        res.status(404).json({ success: false, error: { message: '찬양을 찾을 수 없습니다.' } });
        return;
      }

      // 기존 이미지가 있으면 삭제
      if (song.imagePath) {
        const oldImagePath = path.join(getUploadPath(), path.basename(song.imagePath));
        if (fs.existsSync(oldImagePath)) {
          fs.unlinkSync(oldImagePath);
        }
      }

      // 이미지 경로를 URL로 저장 (/uploads/scores/파일명)
      const imagePath = `/uploads/scores/${file.filename}`;

      // 찬양 업데이트
      const updatedSong = await service.update(req.params.id, { imagePath });

      res.json({ success: true, data: toSongResponse(updatedSong) });
    } catch (error) {
      // 에러 시 업로드된 파일 삭제
      if (req.file) {
        try {
          fs.unlinkSync(req.file.path);
        } catch {
          // 무시
        }
      }
      next(error);
    }
  });

  // 악보 이미지 제공 (static 라우트)
  router.get('/uploads/scores/:filename', (req: Request, res: Response) => {
    const filePath = path.join(getUploadPath(), req.params.filename);
    if (fs.existsSync(filePath)) {
      res.sendFile(filePath);
    } else {
      res.status(404).json({ success: false, error: { message: '이미지를 찾을 수 없습니다.' } });
    }
  });

  return router;
}
