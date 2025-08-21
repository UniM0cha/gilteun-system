import { Router } from 'express';
import { WorshipService } from '../services/worshipService';

const router = Router();
const worshipService = new WorshipService();

// GET /api/worships - 예배 목록 조회
router.get('/', (req, res) => {
  try {
    const { date } = req.query;
    const worships = worshipService.getWorships(date as string);
    return res.json({ success: true, data: worships });
  } catch (error) {
    console.error('예배 목록 조회 오류:', error);
    return res.status(500).json({
      success: false,
      error: '예배 목록을 불러올 수 없습니다.',
    });
  }
});

// GET /api/worships/:id - 특정 예배 조회
router.get('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const worship = worshipService.getWorshipById(id);

    if (!worship) {
      return res.status(404).json({
        success: false,
        error: '예배를 찾을 수 없습니다.',
      });
    }

    return res.json({ success: true, data: worship });
  } catch (error) {
    console.error('예배 조회 오류:', error);
    return res.status(500).json({
      success: false,
      error: '예배 정보를 불러올 수 없습니다.',
    });
  }
});

// POST /api/worships - 예배 생성
router.post('/', (req, res) => {
  try {
    const { typeId, name, date } = req.body;

    if (!typeId || !name || !date) {
      return res.status(400).json({
        success: false,
        error: '필수 정보가 누락되었습니다.',
      });
    }

    const worshipId = worshipService.createWorship({
      typeId,
      name,
      date,
    });

    const worship = worshipService.getWorshipById(worshipId);
    return res.status(201).json({ success: true, data: worship });
  } catch (error) {
    console.error('예배 생성 오류:', error);
    return res.status(500).json({
      success: false,
      error: '예배를 생성할 수 없습니다.',
    });
  }
});

// PUT /api/worships/:id - 예배 수정
router.put('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { name, date, isActive } = req.body;

    const success = worshipService.updateWorship(id, {
      name,
      date,
      isActive,
    });

    if (!success) {
      return res.status(404).json({
        success: false,
        error: '예배를 찾을 수 없습니다.',
      });
    }

    const worship = worshipService.getWorshipById(id);
    return res.json({ success: true, data: worship });
  } catch (error) {
    console.error('예배 수정 오류:', error);
    return res.status(500).json({
      success: false,
      error: '예배를 수정할 수 없습니다.',
    });
  }
});

// DELETE /api/worships/:id - 예배 삭제
router.delete('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const success = worshipService.deleteWorship(id);

    if (!success) {
      return res.status(404).json({
        success: false,
        error: '예배를 찾을 수 없습니다.',
      });
    }

    return res.json({ success: true, message: '예배가 삭제되었습니다.' });
  } catch (error) {
    console.error('예배 삭제 오류:', error);
    return res.status(500).json({
      success: false,
      error: '예배를 삭제할 수 없습니다.',
    });
  }
});

// GET /api/worship-types - 예배 유형 목록 조회
router.get('/types', (_req, res) => {
  try {
    const types = worshipService.getWorshipTypes();
    return res.json({ success: true, data: types });
  } catch (error) {
    console.error('예배 유형 조회 오류:', error);
    return res.status(500).json({
      success: false,
      error: '예배 유형을 불러올 수 없습니다.',
    });
  }
});

export { router as worshipRoutes };
