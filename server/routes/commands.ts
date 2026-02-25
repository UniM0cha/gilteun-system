import { Router } from 'express';
import { nanoid } from 'nanoid';
import { eq } from 'drizzle-orm';
import { db } from "../db";
import { commands } from '../db/schema.js';

const router = Router();

const defaultCommands = [
  { emoji: '1️⃣', label: '1절' },
  { emoji: '2️⃣', label: '2절' },
  { emoji: '3️⃣', label: '3절' },
  { emoji: '🔂', label: '한번 더' },
  { emoji: '🔁', label: '계속 반복' },
  { emoji: '▶️', label: '시작' },
  { emoji: '⏹️', label: '정지' },
  { emoji: '⏭️', label: '다음 곡' },
  { emoji: '🔊', label: '볼륨 업' },
  { emoji: '🔉', label: '볼륨 다운' },
  { emoji: '👍', label: '좋음' },
];

router.get('/', (_req, res) => {
  try {
    const allCommands = db.select().from(commands).all();
    res.json(allCommands);
  } catch (error) {
    console.error('Failed to fetch commands:', error);
    res.status(500).json({ error: 'Failed to fetch commands' });
  }
});

router.post('/', (req, res) => {
  try {
    const { emoji, label } = req.body;
    if (!emoji || !label) {
      res.status(400).json({ error: 'emoji and label are required' });
      return;
    }
    const id = nanoid();
    db.insert(commands).values({ id, emoji, label, isDefault: false }).run();
    const created = db.select().from(commands).where(eq(commands.id, id)).get();
    res.status(201).json(created);
  } catch (error) {
    console.error('Failed to create command:', error);
    res.status(500).json({ error: 'Failed to create command' });
  }
});

router.delete('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const existing = db.select().from(commands).where(eq(commands.id, id)).get();
    if (!existing) {
      res.status(404).json({ error: 'Command not found' });
      return;
    }
    db.delete(commands).where(eq(commands.id, id)).run();
    res.json({ success: true });
  } catch (error) {
    console.error('Failed to delete command:', error);
    res.status(500).json({ error: 'Failed to delete command' });
  }
});

router.post('/reset', (_req, res) => {
  try {
    db.delete(commands).run();
    for (const cmd of defaultCommands) {
      db.insert(commands)
        .values({ id: nanoid(), emoji: cmd.emoji, label: cmd.label, isDefault: true })
        .run();
    }
    const allCommands = db.select().from(commands).all();
    res.json(allCommands);
  } catch (error) {
    console.error('Failed to reset commands:', error);
    res.status(500).json({ error: 'Failed to reset commands' });
  }
});

export default router;
