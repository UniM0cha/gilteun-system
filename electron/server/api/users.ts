import { Router } from 'express';
import { logger } from '../utils/logger';

const router = Router();

// 임시 목업 데이터
const mockUsers = [
  {
    id: 'user-1',
    name: '김찬양',
    role: 'leader',
    isOnline: true,
    lastSeen: new Date().toISOString(),
  },
  {
    id: 'user-2',
    name: '이기타',
    role: 'guitarist',
    isOnline: false,
    lastSeen: new Date(Date.now() - 300000).toISOString(),
  },
];

// 사용자 목록 조회
router.get('/', (req, res) => {
  try {
    const { isOnline, role } = req.query;
    let users = [...mockUsers];

    if (isOnline !== undefined) users = users.filter((u) => u.isOnline === (isOnline === 'true'));
    if (role) users = users.filter((u) => u.role === role);

    res.json({ users, total: users.length });
    logger.info(`사용자 목록 ${users.length}개 반환`);
  } catch (error) {
    logger.error('사용자 목록 조회 실패', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: '사용자 목록 조회 중 오류 발생',
    });
  }
});

// 사용자 상태 업데이트
router.patch('/:id/status', (req, res) => {
  try {
    const id = req.params.id;
    const { isOnline } = req.body;
    const userIndex = mockUsers.findIndex((u) => u.id === id);

    if (userIndex === -1) {
      return res.status(404).json({
        error: 'Not Found',
        message: `사용자 ${id}를 찾을 수 없습니다`,
      });
    }

    mockUsers[userIndex].isOnline = isOnline;
    mockUsers[userIndex].lastSeen = new Date().toISOString();

    res.json(mockUsers[userIndex]);
    logger.info(`사용자 상태 업데이트: ${mockUsers[userIndex].name} - ${isOnline ? 'online' : 'offline'}`);
  } catch (error) {
    logger.error('사용자 상태 업데이트 실패', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: '사용자 상태 업데이트 중 오류 발생',
    });
  }
});

export default router;
