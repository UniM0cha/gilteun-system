import { Express } from 'express';
import multer from 'multer';
import path from 'path';
import { SYSTEM_CONFIG } from '@gilton/shared';

// 파일 업로드 설정
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `score-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: SYSTEM_CONFIG.MAX_FILE_SIZE, // 10MB
  },
  fileFilter: (_req, file, cb) => {
    if (SYSTEM_CONFIG.SUPPORTED_IMAGE_TYPES.includes(file.mimetype as any)) {
      cb(null, true);
    } else {
      cb(new Error('지원하지 않는 파일 형식입니다.'));
    }
  }
});

export function setupRoutes(app: Express): void {
  
  // 예배 관련 API
  app.get('/api/worships', (_req, res) => {
    // TODO: 데이터베이스에서 예배 목록 조회
    res.json({
      success: true,
      data: [
        {
          id: '1',
          typeId: 'sunday-1',
          date: new Date().toISOString(),
          title: '주일 1부 예배',
          scoreIds: [],
        }
      ]
    });
  });

  app.post('/api/worships', (req, res) => {
    // TODO: 새 예배 생성
    const { typeId, date, title } = req.body;
    
    res.json({
      success: true,
      message: '예배가 생성되었습니다.',
      data: {
        id: generateId(),
        typeId,
        date,
        title,
        scoreIds: [],
      }
    });
  });

  // 예배 유형 관련 API
  app.get('/api/worship-types', (_req, res) => {
    // TODO: 데이터베이스에서 예배 유형 조회
    res.json({
      success: true,
      data: [
        { id: 'sunday-1', name: '주일 1부예배', isActive: true },
        { id: 'sunday-2', name: '주일 2부예배', isActive: true },
        { id: 'youth', name: '청년예배', isActive: true },
      ]
    });
  });

  // 악기 관련 API
  app.get('/api/instruments', (_req, res) => {
    // TODO: 데이터베이스에서 악기 목록 조회
    res.json({
      success: true,
      data: [
        { id: 'drums', name: '드럼', icon: '🥁', order: 1 },
        { id: 'bass', name: '베이스', icon: '🎸', order: 2 },
        { id: 'guitar', name: '기타', icon: '🎸', order: 3 },
        { id: 'keyboard', name: '키보드', icon: '🎹', order: 4 },
        { id: 'vocal', name: '보컬', icon: '🎤', order: 5 },
      ]
    });
  });

  app.post('/api/instruments', (req, res) => {
    // TODO: 새 악기 추가
    const { name, icon } = req.body;
    
    res.json({
      success: true,
      message: '악기가 추가되었습니다.',
      data: {
        id: generateId(),
        name,
        icon,
        order: Date.now(),
        isActive: true,
      }
    });
  });

  // 악보 업로드 API
  app.post('/api/scores/upload', upload.single('scoreFile'), (req, res) => {
    if (!req.file) {
      res.status(400).json({
        success: false,
        message: '파일이 업로드되지 않았습니다.'
      });
      return;
    }

    // TODO: 데이터베이스에 악보 정보 저장
    const scoreData = {
      id: generateId(),
      worshipId: req.body.worshipId,
      title: req.body.title || req.file.originalname,
      filename: req.file.filename,
      filepath: req.file.path,
      order: parseInt(req.body.order) || 1,
      pageCount: 1, // TODO: 이미지 분석으로 페이지 수 계산
    };

    res.json({
      success: true,
      message: '악보가 성공적으로 업로드되었습니다.',
      data: scoreData
    });
  });

  // 악보 목록 조회
  app.get('/api/worships/:worshipId/scores', (_req, res) => {
    
    // TODO: 데이터베이스에서 해당 예배의 악보 목록 조회
    res.json({
      success: true,
      data: []
    });
  });

  // 사용자 프로필 관련 API
  app.get('/api/users/:userId', (req, res) => {
    // TODO: 사용자 프로필 조회
    res.json({
      success: true,
      data: {
        id: req.params.userId,
        name: '사용자',
        role: 'session',
        instrumentId: 'guitar',
      }
    });
  });

  // 에러 핸들링 미들웨어
  app.use((error: Error, _req: any, res: any, _next: any) => {
    console.error('API 오류:', error);
    res.status(500).json({
      success: false,
      message: error.message || '서버 내부 오류가 발생했습니다.'
    });
  });
}

function generateId(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}