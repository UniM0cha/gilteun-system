// 라우터 통합

import { Router } from 'express';
import { getDatabase } from '../database/connection.js';
import { ProfileRepository } from '../repositories/ProfileRepository.js';
import { WorshipRepository } from '../repositories/WorshipRepository.js';
import { SongRepository } from '../repositories/SongRepository.js';
import { AnnotationRepository } from '../repositories/AnnotationRepository.js';
import { ProfileService } from '../services/ProfileService.js';
import { WorshipService } from '../services/WorshipService.js';
import { SongService } from '../services/SongService.js';
import { AnnotationService } from '../services/AnnotationService.js';
import { createProfileRouter } from './profiles.js';
import { createWorshipRouter } from './worships.js';
import { createSongRouter } from './songs.js';
import { createAnnotationRouter } from './annotations.js';

export function createApiRouter(): Router {
  const router = Router();
  const db = getDatabase();

  // Repository 인스턴스 생성
  const profileRepository = new ProfileRepository(db);
  const worshipRepository = new WorshipRepository(db);
  const songRepository = new SongRepository(db);
  const annotationRepository = new AnnotationRepository(db);

  // Service 인스턴스 생성
  const profileService = new ProfileService(profileRepository);
  const worshipService = new WorshipService(worshipRepository);
  const songService = new SongService(songRepository);
  const annotationService = new AnnotationService(annotationRepository);

  // 라우터 등록
  router.use('/profiles', createProfileRouter(profileService));
  router.use('/worships', createWorshipRouter(worshipService));
  router.use('/songs', createSongRouter(songService));
  router.use('/annotations', createAnnotationRouter(annotationService));

  // 헬스 체크
  router.get('/health', (_req, res) => {
    res.json({ success: true, message: 'API 서버가 정상 동작 중입니다.' });
  });

  return router;
}
