import { Router } from 'express';
import { nanoid } from 'nanoid';
import { eq } from 'drizzle-orm';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { db } from '../db/index.js';
import { sheets, drawingPaths } from '../db/schema.js';
import { config } from '../config.js';

const router = Router();

// Multer 설정
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    const dir = path.join(config.uploadsDir, 'sheets');
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${nanoid()}${ext}`);
  },
});

const upload = multer({
  storage,
  fileFilter: (_req, file, cb) => {
    const allowed = ['.jpg', '.jpeg', '.png'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Only JPG and PNG files are allowed'));
    }
  },
  limits: { fileSize: 50 * 1024 * 1024 },
});

// POST /api/worships/:worshipId/sheets - 악보 추가
router.post('/worships/:worshipId/sheets', upload.single('image'), (req, res) => {
  try {
    const { worshipId } = req.params;
    const file = req.file;
    if (!file) {
      res.status(400).json({ error: 'Image file is required' });
      return;
    }

    const title = req.body.title || file.originalname.replace(/\.[^/.]+$/, '');

    // 현재 최대 order 값
    const existingSheets = db
      .select()
      .from(sheets)
      .where(eq(sheets.worshipId, worshipId))
      .all();
    const maxOrder = existingSheets.reduce((max, s) => Math.max(max, s.order), -1);

    const id = nanoid();
    const imagePath = `sheets/${file.filename}`;
    const now = new Date().toISOString();

    db.insert(sheets)
      .values({
        id,
        worshipId,
        fileName: file.originalname,
        title,
        imagePath,
        order: maxOrder + 1,
        createdAt: now,
      })
      .run();

    const created = db.select().from(sheets).where(eq(sheets.id, id)).get();
    res.status(201).json(created);
  } catch (error) {
    console.error('Failed to upload sheet:', error);
    res.status(500).json({ error: 'Failed to upload sheet' });
  }
});

// PUT /api/sheets/:id - 악보 제목 수정
router.put('/sheets/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { title } = req.body;
    const existing = db.select().from(sheets).where(eq(sheets.id, id)).get();
    if (!existing) {
      res.status(404).json({ error: 'Sheet not found' });
      return;
    }
    if (title) {
      db.update(sheets).set({ title }).where(eq(sheets.id, id)).run();
    }
    const updated = db.select().from(sheets).where(eq(sheets.id, id)).get();
    res.json(updated);
  } catch (error) {
    console.error('Failed to update sheet:', error);
    res.status(500).json({ error: 'Failed to update sheet' });
  }
});

// DELETE /api/sheets/:id - 악보 삭제
router.delete('/sheets/:id', (req, res) => {
  try {
    const { id } = req.params;
    const existing = db.select().from(sheets).where(eq(sheets.id, id)).get();
    if (!existing) {
      res.status(404).json({ error: 'Sheet not found' });
      return;
    }
    // drawingPaths 삭제
    db.delete(drawingPaths).where(eq(drawingPaths.sheetId, id)).run();
    // 이미지 파일 삭제
    const imagePath = path.join(config.uploadsDir, existing.imagePath);
    if (fs.existsSync(imagePath)) {
      fs.unlinkSync(imagePath);
    }
    db.delete(sheets).where(eq(sheets.id, id)).run();
    res.json({ success: true });
  } catch (error) {
    console.error('Failed to delete sheet:', error);
    res.status(500).json({ error: 'Failed to delete sheet' });
  }
});

// PUT /api/worships/:worshipId/sheets/order - 악보 순서 변경
router.put('/worships/:worshipId/sheets/order', (req, res) => {
  try {
    const { orderedIds } = req.body;
    if (!Array.isArray(orderedIds)) {
      res.status(400).json({ error: 'orderedIds array is required' });
      return;
    }
    for (let i = 0; i < orderedIds.length; i++) {
      db.update(sheets)
        .set({ order: i })
        .where(eq(sheets.id, orderedIds[i]))
        .run();
    }
    res.json({ success: true });
  } catch (error) {
    console.error('Failed to reorder sheets:', error);
    res.status(500).json({ error: 'Failed to reorder sheets' });
  }
});

// GET /api/sheets/:id/drawings - 드로잉 패스 조회
router.get('/sheets/:id/drawings', (req, res) => {
  try {
    const { id } = req.params;
    const paths = db
      .select()
      .from(drawingPaths)
      .where(eq(drawingPaths.sheetId, id))
      .all();
    // points를 JSON으로 파싱
    const parsed = paths.map((p) => ({
      ...p,
      points: JSON.parse(p.points),
    }));
    res.json(parsed);
  } catch (error) {
    console.error('Failed to fetch drawings:', error);
    res.status(500).json({ error: 'Failed to fetch drawings' });
  }
});

export default router;
