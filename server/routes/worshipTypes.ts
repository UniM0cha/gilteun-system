import { Router } from 'express';
import { nanoid } from 'nanoid';
import { eq } from 'drizzle-orm';
import { db } from "../db";
import { worshipTypes } from '../db/schema.js';

const router = Router();

router.get('/', (_req, res) => {
  try {
    const types = db.select().from(worshipTypes).all();
    res.json(types);
  } catch (error) {
    console.error('Failed to fetch worship types:', error);
    res.status(500).json({ error: 'Failed to fetch worship types' });
  }
});

router.post('/', (req, res) => {
  try {
    const { name, color } = req.body;
    if (!name || !color) {
      res.status(400).json({ error: 'name and color are required' });
      return;
    }
    const id = nanoid();
    db.insert(worshipTypes).values({ id, name, color }).run();
    const created = db.select().from(worshipTypes).where(eq(worshipTypes.id, id)).get();
    res.status(201).json(created);
  } catch (error) {
    console.error('Failed to create worship type:', error);
    res.status(500).json({ error: 'Failed to create worship type' });
  }
});

router.put('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { name, color } = req.body;
    const existing = db.select().from(worshipTypes).where(eq(worshipTypes.id, id)).get();
    if (!existing) {
      res.status(404).json({ error: 'Worship type not found' });
      return;
    }
    db.update(worshipTypes)
      .set({ name: name ?? existing.name, color: color ?? existing.color })
      .where(eq(worshipTypes.id, id))
      .run();
    const updated = db.select().from(worshipTypes).where(eq(worshipTypes.id, id)).get();
    res.json(updated);
  } catch (error) {
    console.error('Failed to update worship type:', error);
    res.status(500).json({ error: 'Failed to update worship type' });
  }
});

router.delete('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const existing = db.select().from(worshipTypes).where(eq(worshipTypes.id, id)).get();
    if (!existing) {
      res.status(404).json({ error: 'Worship type not found' });
      return;
    }
    db.delete(worshipTypes).where(eq(worshipTypes.id, id)).run();
    res.json({ success: true });
  } catch (error) {
    console.error('Failed to delete worship type:', error);
    res.status(500).json({ error: 'Failed to delete worship type' });
  }
});

export default router;
