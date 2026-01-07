// 주석 라우터

import { Router, Request, Response, NextFunction } from 'express';
import { AnnotationService } from '../services/AnnotationService.js';
import type { AnnotationTool } from '../database/types.js';

export function createAnnotationRouter(service: AnnotationService): Router {
  const router = Router();

  // 찬양별 주석 조회
  router.get('/song/:songId', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { profileId } = req.query;
      let annotations;

      if (profileId && typeof profileId === 'string') {
        annotations = await service.getBySongAndProfile(req.params.songId, profileId);
      } else {
        annotations = await service.getBySongId(req.params.songId);
      }

      res.json({ success: true, data: annotations });
    } catch (error) {
      next(error);
    }
  });

  // ID로 주석 조회
  router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const annotation = await service.getById(req.params.id);
      if (!annotation) {
        res.status(404).json({ success: false, error: { message: '주석을 찾을 수 없습니다.' } });
        return;
      }
      res.json({ success: true, data: annotation });
    } catch (error) {
      next(error);
    }
  });

  // 주석 생성
  router.post('/', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { songId, profileId, svgPath, color, tool, strokeWidth, metadata } = req.body as {
        songId: string;
        profileId: string;
        svgPath: string;
        color: string;
        tool: AnnotationTool;
        strokeWidth?: number | null;
        metadata?: Record<string, unknown> | null;
      };
      const annotation = await service.create({ songId, profileId, svgPath, color, tool, strokeWidth, metadata });
      res.status(201).json({ success: true, data: annotation });
    } catch (error) {
      next(error);
    }
  });

  // 벌크 주석 생성
  router.post('/bulk', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { annotations } = req.body as {
        annotations: Array<{
          songId: string;
          profileId: string;
          svgPath: string;
          color: string;
          tool: AnnotationTool;
          strokeWidth?: number | null;
          metadata?: Record<string, unknown> | null;
        }>;
      };
      const created = await service.createBulk(annotations);
      res.status(201).json({ success: true, data: created });
    } catch (error) {
      next(error);
    }
  });

  // 주석 수정
  router.put('/:id', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { svgPath, color, tool, strokeWidth, metadata } = req.body as {
        svgPath?: string;
        color?: string;
        tool?: AnnotationTool;
        strokeWidth?: number | null;
        metadata?: Record<string, unknown> | null;
      };
      const annotation = await service.update(req.params.id, { svgPath, color, tool, strokeWidth, metadata });
      res.json({ success: true, data: annotation });
    } catch (error) {
      next(error);
    }
  });

  // 주석 삭제
  router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
    try {
      await service.delete(req.params.id);
      res.json({ success: true, message: '주석이 삭제되었습니다.' });
    } catch (error) {
      next(error);
    }
  });

  // 프로필의 특정 찬양 주석 모두 삭제
  router.delete('/song/:songId/profile/:profileId', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const count = await service.deleteByProfileAndSong(req.params.profileId, req.params.songId);
      res.json({ success: true, message: `${count}개의 주석이 삭제되었습니다.` });
    } catch (error) {
      next(error);
    }
  });

  return router;
}
