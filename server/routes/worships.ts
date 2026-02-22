import { Router } from 'express';
import { nanoid } from 'nanoid';
import { eq } from 'drizzle-orm';
import fs from 'fs';
import path from 'path';
import { db } from '../db/index.js';
import { worships, sheets, drawingPaths } from '../db/schema.js';
import { config } from '../config.js';

const router = Router();

router.get('/', (_req, res) => {
  try {
    const allWorships = db.select().from(worships).all();
    const result = allWorships.map((w) => {
      const worshipSheets = db
        .select()
        .from(sheets)
        .where(eq(sheets.worshipId, w.id))
        .all()
        .sort((a, b) => a.order - b.order);
      return { ...w, sheets: worshipSheets };
    });
    res.json(result);
  } catch (error) {
    console.error('Failed to fetch worships:', error);
    res.status(500).json({ error: 'Failed to fetch worships' });
  }
});

router.post('/', (req, res) => {
  try {
    const { title, date, typeId } = req.body;
    if (!title || !date || !typeId) {
      res.status(400).json({ error: 'title, date, and typeId are required' });
      return;
    }
    const id = nanoid();
    const now = new Date().toISOString();
    db.insert(worships)
      .values({ id, title, date, typeId, createdAt: now, updatedAt: now })
      .run();
    const created = db.select().from(worships).where(eq(worships.id, id)).get();
    res.status(201).json({ ...created, sheets: [] });
  } catch (error) {
    console.error('Failed to create worship:', error);
    res.status(500).json({ error: 'Failed to create worship' });
  }
});

router.get('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const worship = db.select().from(worships).where(eq(worships.id, id)).get();
    if (!worship) {
      res.status(404).json({ error: 'Worship not found' });
      return;
    }
    const worshipSheets = db
      .select()
      .from(sheets)
      .where(eq(sheets.worshipId, id))
      .all()
      .sort((a, b) => a.order - b.order);
    res.json({ ...worship, sheets: worshipSheets });
  } catch (error) {
    console.error('Failed to fetch worship:', error);
    res.status(500).json({ error: 'Failed to fetch worship' });
  }
});

router.put('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { title, date, typeId } = req.body;
    const existing = db.select().from(worships).where(eq(worships.id, id)).get();
    if (!existing) {
      res.status(404).json({ error: 'Worship not found' });
      return;
    }
    const now = new Date().toISOString();
    db.update(worships)
      .set({
        title: title ?? existing.title,
        date: date ?? existing.date,
        typeId: typeId ?? existing.typeId,
        updatedAt: now,
      })
      .where(eq(worships.id, id))
      .run();
    const updated = db.select().from(worships).where(eq(worships.id, id)).get();
    const worshipSheets = db
      .select()
      .from(sheets)
      .where(eq(sheets.worshipId, id))
      .all()
      .sort((a, b) => a.order - b.order);
    res.json({ ...updated, sheets: worshipSheets });
  } catch (error) {
    console.error('Failed to update worship:', error);
    res.status(500).json({ error: 'Failed to update worship' });
  }
});

router.delete('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const existing = db.select().from(worships).where(eq(worships.id, id)).get();
    if (!existing) {
      res.status(404).json({ error: 'Worship not found' });
      return;
    }
    // 연관 sheets의 drawing_paths 삭제 + 이미지 파일 삭제
    const worshipSheets = db.select().from(sheets).where(eq(sheets.worshipId, id)).all();
    for (const sheet of worshipSheets) {
      db.delete(drawingPaths).where(eq(drawingPaths.sheetId, sheet.id)).run();
      const imagePath = path.join(config.uploadsDir, sheet.imagePath);
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }
    }
    db.delete(sheets).where(eq(sheets.worshipId, id)).run();
    db.delete(worships).where(eq(worships.id, id)).run();
    res.json({ success: true });
  } catch (error) {
    console.error('Failed to delete worship:', error);
    res.status(500).json({ error: 'Failed to delete worship' });
  }
});

export default router;
