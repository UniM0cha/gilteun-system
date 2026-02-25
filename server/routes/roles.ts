import { Router } from 'express';
import { nanoid } from 'nanoid';
import { eq } from 'drizzle-orm';
import { db } from "../db";
import { roles, profiles } from '../db/schema.js';

const router = Router();

router.get('/', (_req, res) => {
  try {
    const allRoles = db.select().from(roles).all();
    res.json(allRoles);
  } catch (error) {
    console.error('Failed to fetch roles:', error);
    res.status(500).json({ error: 'Failed to fetch roles' });
  }
});

router.post('/', (req, res) => {
  try {
    const { name, icon } = req.body;
    if (!name || !icon) {
      res.status(400).json({ error: 'name and icon are required' });
      return;
    }
    const id = nanoid();
    db.insert(roles).values({ id, name, icon }).run();
    const created = db.select().from(roles).where(eq(roles.id, id)).get();
    res.status(201).json(created);
  } catch (error) {
    console.error('Failed to create role:', error);
    res.status(500).json({ error: 'Failed to create role' });
  }
});

router.put('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { name, icon } = req.body;
    const existing = db.select().from(roles).where(eq(roles.id, id)).get();
    if (!existing) {
      res.status(404).json({ error: 'Role not found' });
      return;
    }
    db.update(roles)
      .set({ name: name ?? existing.name, icon: icon ?? existing.icon })
      .where(eq(roles.id, id))
      .run();
    const updated = db.select().from(roles).where(eq(roles.id, id)).get();
    res.json(updated);
  } catch (error) {
    console.error('Failed to update role:', error);
    res.status(500).json({ error: 'Failed to update role' });
  }
});

router.delete('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const existing = db.select().from(roles).where(eq(roles.id, id)).get();
    if (!existing) {
      res.status(404).json({ error: 'Role not found' });
      return;
    }
    const inUse = db.select().from(profiles).where(eq(profiles.roleId, id)).get();
    if (inUse) {
      res.status(400).json({ error: 'Role is in use by a profile' });
      return;
    }
    db.delete(roles).where(eq(roles.id, id)).run();
    res.json({ success: true });
  } catch (error) {
    console.error('Failed to delete role:', error);
    res.status(500).json({ error: 'Failed to delete role' });
  }
});

export default router;
