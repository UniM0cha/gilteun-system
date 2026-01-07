// 예배 라우터

import { Router, Request, Response, NextFunction } from 'express';
import { WorshipService } from '../services/WorshipService.js';

export function createWorshipRouter(service: WorshipService): Router {
  const router = Router();

  // 전체 예배 조회 (최근순)
  router.get('/', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : undefined;
      const worships = limit ? await service.getRecent(limit) : await service.getAll();
      res.json({ success: true, data: worships });
    } catch (error) {
      next(error);
    }
  });

  // ID로 예배 조회
  router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const worship = await service.getById(req.params.id);
      if (!worship) {
        res.status(404).json({ success: false, error: { message: '예배를 찾을 수 없습니다.' } });
        return;
      }
      res.json({ success: true, data: worship });
    } catch (error) {
      next(error);
    }
  });

  // 예배 생성
  router.post('/', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { title, date, time, memo } = req.body as {
        title: string;
        date: string;
        time?: string | null;
        memo?: string | null;
      };
      const worship = await service.create({ title, date, time, memo });
      res.status(201).json({ success: true, data: worship });
    } catch (error) {
      next(error);
    }
  });

  // 예배 수정
  router.put('/:id', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { title, date, time, memo } = req.body as {
        title?: string;
        date?: string;
        time?: string | null;
        memo?: string | null;
      };
      const worship = await service.update(req.params.id, { title, date, time, memo });
      res.json({ success: true, data: worship });
    } catch (error) {
      next(error);
    }
  });

  // 예배 삭제
  router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
    try {
      await service.delete(req.params.id);
      res.json({ success: true, message: '예배가 삭제되었습니다.' });
    } catch (error) {
      next(error);
    }
  });

  return router;
}
