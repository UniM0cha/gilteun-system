// 프로필 라우터

import { Router, Request, Response, NextFunction } from 'express';
import { ProfileService } from '../services/ProfileService.js';
import type { ProfileRole } from '../database/types.js';

export function createProfileRouter(service: ProfileService): Router {
  const router = Router();

  // 전체 프로필 조회
  router.get('/', async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const profiles = await service.getAll();
      res.json({ success: true, data: profiles });
    } catch (error) {
      next(error);
    }
  });

  // ID로 프로필 조회
  router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const profile = await service.getById(req.params.id);
      if (!profile) {
        res.status(404).json({ success: false, error: { message: '프로필을 찾을 수 없습니다.' } });
        return;
      }
      res.json({ success: true, data: profile });
    } catch (error) {
      next(error);
    }
  });

  // 프로필 생성
  router.post('/', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { name, role, icon, color } = req.body as {
        name: string;
        role: ProfileRole;
        icon: string;
        color: string;
      };
      const profile = await service.create({ name, role, icon, color });
      res.status(201).json({ success: true, data: profile });
    } catch (error) {
      next(error);
    }
  });

  // 프로필 수정
  router.put('/:id', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { name, role, icon, color } = req.body as {
        name?: string;
        role?: ProfileRole;
        icon?: string;
        color?: string;
      };
      const profile = await service.update(req.params.id, { name, role, icon, color });
      res.json({ success: true, data: profile });
    } catch (error) {
      next(error);
    }
  });

  // 프로필 삭제
  router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
    try {
      await service.delete(req.params.id);
      res.json({ success: true, message: '프로필이 삭제되었습니다.' });
    } catch (error) {
      next(error);
    }
  });

  return router;
}
