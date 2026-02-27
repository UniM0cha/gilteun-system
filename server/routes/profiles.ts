import { Router } from "express";
import { nanoid } from "nanoid";
import { eq } from "drizzle-orm";
import { db } from "../db";
import { profiles } from "../db/schema.js";

const router = Router();

router.get("/", (_req, res) => {
  try {
    const allProfiles = db.select().from(profiles).all();
    res.json(allProfiles);
  } catch (error) {
    console.error("Failed to fetch profiles:", error);
    res.status(500).json({ error: "Failed to fetch profiles" });
  }
});

router.post("/", (req, res) => {
  try {
    const { name, roleId, color } = req.body;
    if (!name || !roleId || !color) {
      res.status(400).json({ error: "name, roleId, and color are required" });
      return;
    }
    const id = nanoid();
    db.insert(profiles).values({ id, name, roleId, color }).run();
    const created = db.select().from(profiles).where(eq(profiles.id, id)).get();
    res.status(201).json(created);
  } catch (error) {
    console.error("Failed to create profile:", error);
    res.status(500).json({ error: "Failed to create profile" });
  }
});

router.put("/:id", (req, res) => {
  try {
    const { id } = req.params;
    const { name, roleId, color } = req.body;
    const existing = db.select().from(profiles).where(eq(profiles.id, id)).get();
    if (!existing) {
      res.status(404).json({ error: "Profile not found" });
      return;
    }
    db.update(profiles)
      .set({
        name: name ?? existing.name,
        roleId: roleId ?? existing.roleId,
        color: color ?? existing.color,
      })
      .where(eq(profiles.id, id))
      .run();
    const updated = db.select().from(profiles).where(eq(profiles.id, id)).get();
    res.json(updated);
  } catch (error) {
    console.error("Failed to update profile:", error);
    res.status(500).json({ error: "Failed to update profile" });
  }
});

router.delete("/:id", (req, res) => {
  try {
    const { id } = req.params;
    const existing = db.select().from(profiles).where(eq(profiles.id, id)).get();
    if (!existing) {
      res.status(404).json({ error: "Profile not found" });
      return;
    }
    db.delete(profiles).where(eq(profiles.id, id)).run();
    res.json({ success: true });
  } catch (error) {
    console.error("Failed to delete profile:", error);
    res.status(500).json({ error: "Failed to delete profile" });
  }
});

export default router;
