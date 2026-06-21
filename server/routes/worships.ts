import { Router } from "express";
import { nanoid } from "nanoid";
import { eq, and, like, desc, inArray, sql } from "drizzle-orm";
import fs from "fs";
import path from "path";
import { db } from "../db";
import { worships, sheets, drawingPaths } from "../db/schema.js";
import { config } from "../config.js";

const router = Router();

router.get("/", (req, res) => {
  try {
    // 쿼리 파라미터 정규화 — 중복 파라미터(?q=a&q=b)로 배열이 와도 안전하게 string으로
    const str = (v: unknown) => (typeof v === "string" ? v : "");
    const page = Math.max(1, parseInt(str(req.query.page)) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(str(req.query.limit)) || 20));
    const offset = (page - 1) * limit;

    const typeId = str(req.query.typeId);
    const q = str(req.query.q);
    // year/month는 숫자만 허용 (LIKE 와일드카드 주입 차단)
    const year = /^\d{4}$/.test(str(req.query.year)) ? str(req.query.year) : "";
    const month = /^\d{1,2}$/.test(str(req.query.month)) ? str(req.query.month) : "";

    // 동적 WHERE 조립 (date는 ISO/YYYY-MM-DD text라 prefix LIKE = 날짜 범위)
    const conditions = [];
    if (typeId) conditions.push(eq(worships.typeId, typeId));
    if (q) {
      // 사용자 입력의 LIKE 와일드카드(%, _, \)를 이스케이프
      const esc = q.replace(/[\\%_]/g, (c) => `\\${c}`);
      conditions.push(sql`${worships.title} like ${`%${esc}%`} escape '\\'`);
    }
    if (year && month) {
      conditions.push(like(worships.date, `${year}-${month.padStart(2, "0")}-%`));
    } else if (year) {
      conditions.push(like(worships.date, `${year}-%`));
    }
    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const countRow = db
      .select({ total: sql<number>`cast(count(*) as int)` })
      .from(worships)
      .where(where)
      .get();
    const total = countRow?.total ?? 0;

    const items = db
      .select()
      .from(worships)
      .where(where)
      .orderBy(desc(worships.date), desc(worships.createdAt))
      .limit(limit)
      .offset(offset)
      .all();

    // sheets는 페이지 worshipId들을 한 번에 조회 → N+1 제거
    const worshipIds = items.map((w) => w.id);
    const allSheets =
      worshipIds.length > 0 ? db.select().from(sheets).where(inArray(sheets.worshipId, worshipIds)).all() : [];
    const sheetsByWorshipId = new Map<string, typeof allSheets>();
    for (const sheet of allSheets) {
      const arr = sheetsByWorshipId.get(sheet.worshipId) ?? [];
      arr.push(sheet);
      sheetsByWorshipId.set(sheet.worshipId, arr);
    }

    const result = items.map((w) => ({
      ...w,
      sheets: (sheetsByWorshipId.get(w.id) ?? []).sort((a, b) => a.order - b.order),
    }));

    const hasMore = offset + limit < total;
    res.json({ items: result, total, page, hasMore, nextPage: hasMore ? page + 1 : null });
  } catch (error) {
    console.error("Failed to fetch worships:", error);
    res.status(500).json({ error: "Failed to fetch worships" });
  }
});

// 연도 목록 (필터 드롭다운용) — 반드시 GET /:id 보다 앞에 등록할 것
router.get("/years", (_req, res) => {
  try {
    const rows = db
      .select({ year: sql<string>`substr(${worships.date}, 1, 4)` })
      .from(worships)
      .groupBy(sql`substr(${worships.date}, 1, 4)`)
      .orderBy(desc(sql`substr(${worships.date}, 1, 4)`))
      .all();
    res.json(rows.map((r) => parseInt(r.year)).filter((y) => !Number.isNaN(y)));
  } catch (error) {
    console.error("Failed to fetch worship years:", error);
    res.status(500).json({ error: "Failed to fetch worship years" });
  }
});

router.post("/", (req, res) => {
  try {
    const { title, date, typeId } = req.body;
    if (!title || !date || !typeId) {
      res.status(400).json({ error: "title, date, and typeId are required" });
      return;
    }
    const id = nanoid();
    const now = new Date().toISOString();
    db.insert(worships).values({ id, title, date, typeId, createdAt: now, updatedAt: now }).run();
    const created = db.select().from(worships).where(eq(worships.id, id)).get();
    res.status(201).json({ ...created, sheets: [] });
  } catch (error) {
    console.error("Failed to create worship:", error);
    res.status(500).json({ error: "Failed to create worship" });
  }
});

router.get("/:id", (req, res) => {
  try {
    const { id } = req.params;
    const worship = db.select().from(worships).where(eq(worships.id, id)).get();
    if (!worship) {
      res.status(404).json({ error: "Worship not found" });
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
    console.error("Failed to fetch worship:", error);
    res.status(500).json({ error: "Failed to fetch worship" });
  }
});

router.put("/:id", (req, res) => {
  try {
    const { id } = req.params;
    const { title, date, typeId } = req.body;
    const existing = db.select().from(worships).where(eq(worships.id, id)).get();
    if (!existing) {
      res.status(404).json({ error: "Worship not found" });
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
    console.error("Failed to update worship:", error);
    res.status(500).json({ error: "Failed to update worship" });
  }
});

router.delete("/:id", (req, res) => {
  try {
    const { id } = req.params;
    const existing = db.select().from(worships).where(eq(worships.id, id)).get();
    if (!existing) {
      res.status(404).json({ error: "Worship not found" });
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
    console.error("Failed to delete worship:", error);
    res.status(500).json({ error: "Failed to delete worship" });
  }
});

export default router;
