import { Router } from 'express';
import { logger } from '../utils/logger';

const router = Router();

// 임시 목업 데이터
const mockAnnotations = [
  {
    id: 1,
    songId: 1,
    userId: 'user-1',
    userName: '김찬양',
    layer: '김찬양의 주석',
    svgPath: 'M10,10 L50,50',
    color: '#ff0000',
    tool: 'pen',
    createdAt: new Date().toISOString(),
  },
];

// 주석 목록 조회
router.get('/', (req, res) => {
  try {
    const { songId, userId, limit = 10, offset = 0 } = req.query;
    let annotations = [...mockAnnotations];

    if (songId) annotations = annotations.filter(a => a.songId === Number(songId));
    if (userId) annotations = annotations.filter(a => a.userId === userId);

    const total = annotations.length;
    const paginatedAnnotations = annotations.slice(Number(offset), Number(offset) + Number(limit));

    res.json({
      annotations: paginatedAnnotations,
      pagination: {
        total,
        limit: Number(limit),
        offset: Number(offset),
        hasMore: Number(offset) + Number(limit) < total,
      },
    });

    logger.info(`주석 목록 ${paginatedAnnotations.length}개 반환`);
  } catch (error) {
    logger.error('주석 목록 조회 실패', error);
    res.status(500).json({ error: 'Internal Server Error', message: '주석 목록 조회 중 오류 발생' });
  }
});

// 주석 생성
router.post('/', (req, res) => {
  try {
    const { songId, userId, userName, layer, svgPath, color, tool } = req.body;

    if (!songId || !userId || !userName || !svgPath) {
      return res.status(400).json({
        error: 'Bad Request',
        message: '필수 항목이 누락되었습니다',
        required: ['songId', 'userId', 'userName', 'svgPath'],
      });
    }

    const newAnnotation = {
      id: Math.max(...mockAnnotations.map(a => a.id)) + 1,
      songId: Number(songId),
      userId,
      userName,
      layer: layer || `${userName}의 주석`,
      svgPath,
      color: color || '#000000',
      tool: tool || 'pen',
      createdAt: new Date().toISOString(),
    };

    mockAnnotations.push(newAnnotation);
    logger.info(`새 주석 생성: ${newAnnotation.userName} - ${newAnnotation.songId}`);
    res.status(201).json(newAnnotation);
  } catch (error) {
    logger.error('주석 생성 실패', error);
    res.status(500).json({ error: 'Internal Server Error', message: '주석 생성 중 오류 발생' });
  }
});

export default router;
