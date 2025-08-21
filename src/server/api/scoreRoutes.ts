import { Router } from 'express';
import { ScoreService } from '../services/scoreService';
import { FileService } from '../services/fileService';

const router = Router();
const scoreService = new ScoreService();
const fileService = new FileService();

// GET /api/scores/worship/:worshipId - 예배별 악보 목록 조회
router.get('/worship/:worshipId', (req, res) => {
  try {
    const { worshipId } = req.params;
    const scores = scoreService.getScoresByWorshipId(worshipId);
    return res.json({ success: true, data: scores });
  } catch (error) {
    console.error('악보 목록 조회 오류:', error);
    return res.status(500).json({
      success: false,
      error: '악보 목록을 불러올 수 없습니다.',
    });
  }
});

// GET /api/scores/:id - 특정 악보 조회
router.get('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const score = scoreService.getScoreById(id);

    if (!score) {
      return res.status(404).json({
        success: false,
        error: '악보를 찾을 수 없습니다.',
      });
    }

    return res.json({ success: true, data: score });
  } catch (error) {
    console.error('악보 조회 오류:', error);
    return res.status(500).json({
      success: false,
      error: '악보 정보를 불러올 수 없습니다.',
    });
  }
});

// POST /api/scores - 악보 업로드
router.post('/', fileService.getScoreUploadConfig().single('scoreFile'), (req, res) => {
  try {
    const { worshipId, title, orderIndex } = req.body;
    const file = req.file;

    if (!worshipId || !title) {
      return res.status(400).json({
        success: false,
        error: '예배 ID와 제목이 필요합니다.',
      });
    }

    if (!file) {
      return res.status(400).json({
        success: false,
        error: '악보 파일이 필요합니다.',
      });
    }

    const scoreId = scoreService.createScore({
      worshipId,
      title,
      filePath: fileService.getScoreRelativePath(file.filename),
      orderIndex: orderIndex ? parseInt(orderIndex) : undefined,
    });

    const score = scoreService.getScoreById(scoreId);
    return res.status(201).json({ success: true, data: score });
  } catch (error) {
    console.error('악보 업로드 오류:', error);
    return res.status(500).json({
      success: false,
      error: '악보를 업로드할 수 없습니다.',
    });
  }
});

// PUT /api/scores/:id - 악보 정보 수정
router.put('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { title, orderIndex } = req.body;

    const success = scoreService.updateScore(id, {
      title,
      orderIndex: orderIndex ? parseInt(orderIndex) : undefined,
    });

    if (!success) {
      return res.status(404).json({
        success: false,
        error: '악보를 찾을 수 없습니다.',
      });
    }

    const score = scoreService.getScoreById(id);
    return res.json({ success: true, data: score });
  } catch (error) {
    console.error('악보 수정 오류:', error);
    return res.status(500).json({
      success: false,
      error: '악보를 수정할 수 없습니다.',
    });
  }
});

// DELETE /api/scores/:id - 악보 삭제
router.delete('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const success = scoreService.deleteScore(id);

    if (!success) {
      return res.status(404).json({
        success: false,
        error: '악보를 찾을 수 없습니다.',
      });
    }

    return res.json({ success: true, message: '악보가 삭제되었습니다.' });
  } catch (error) {
    console.error('악보 삭제 오류:', error);
    return res.status(500).json({
      success: false,
      error: '악보를 삭제할 수 없습니다.',
    });
  }
});

// PUT /api/scores/worship/:worshipId/reorder - 악보 순서 변경
router.put('/worship/:worshipId/reorder', (req, res) => {
  try {
    const { worshipId } = req.params;
    const { scoreOrders } = req.body;

    if (!Array.isArray(scoreOrders)) {
      return res.status(400).json({
        success: false,
        error: '올바른 순서 정보가 필요합니다.',
      });
    }

    const success = scoreService.reorderScores(worshipId, scoreOrders);

    if (!success) {
      return res.status(400).json({
        success: false,
        error: '악보 순서를 변경할 수 없습니다.',
      });
    }

    const scores = scoreService.getScoresByWorshipId(worshipId);
    return res.json({ success: true, data: scores });
  } catch (error) {
    console.error('악보 순서 변경 오류:', error);
    return res.status(500).json({
      success: false,
      error: '악보 순서를 변경할 수 없습니다.',
    });
  }
});

export { router as scoreRoutes };
