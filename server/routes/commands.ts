import { Router } from "express";
import { nanoid } from "nanoid";
import { asc, eq, max } from "drizzle-orm";
import type { Server } from "socket.io";
import { db } from "../db";
import { commands, profileCommandOrders, profiles } from "../db/schema.js";

const router = Router();

// 명령 목록과 순서는 전역 갱신 이벤트로 알린다. 각 클라이언트는 자신의 profileId로 다시 조회한다.
function broadcastCommandsUpdate(io: Server | undefined) {
  if (io) io.emit("commands:updated");
}

const defaultCommands = [
  { emoji: "1️⃣", label: "1절" },
  { emoji: "2️⃣", label: "2절" },
  { emoji: "3️⃣", label: "3절" },
  { emoji: "🔂", label: "한번 더" },
  { emoji: "🔁", label: "계속 반복" },
  { emoji: "▶️", label: "시작" },
  { emoji: "⏹️", label: "정지" },
  { emoji: "⏭️", label: "다음 곡" },
  { emoji: "🔊", label: "볼륨 업" },
  { emoji: "🔉", label: "볼륨 다운" },
  { emoji: "👍", label: "좋음" },
];

function getGlobalCommands() {
  return db.select().from(commands).orderBy(asc(commands.order), asc(commands.id)).all();
}

function getProfileOrder(profileId: string) {
  return db
    .select()
    .from(profileCommandOrders)
    .where(eq(profileCommandOrders.profileId, profileId))
    .orderBy(asc(profileCommandOrders.order))
    .all();
}

function getEffectiveCommands(profileId?: string) {
  const globalCommands = getGlobalCommands();
  if (!profileId) return globalCommands;

  const profileOrder = getProfileOrder(profileId);
  if (profileOrder.length === 0) return globalCommands;

  const commandById = new Map(globalCommands.map((command) => [command.id, command]));
  const ordered = profileOrder.flatMap(({ commandId }) => {
    const command = commandById.get(commandId);
    if (!command) return [];
    commandById.delete(commandId);
    return [command];
  });

  // 개인 순서 저장 후 추가된 전역 명령은 전역 순서를 유지한 채 마지막에 붙인다.
  return [...ordered, ...globalCommands.filter((command) => commandById.has(command.id))].map((command, order) => ({
    ...command,
    order,
  }));
}

function validateOrderedIds(value: unknown): { orderedIds: string[] } | { error: string } {
  if (!Array.isArray(value) || !value.every((id) => typeof id === "string")) {
    return { error: "orderedIds must be an array of command IDs" };
  }
  if (new Set(value).size !== value.length) {
    return { error: "orderedIds must not contain duplicates" };
  }

  const existingIds = getGlobalCommands().map((command) => command.id);
  const requestedIds = new Set(value);
  if (existingIds.length !== value.length || existingIds.some((id) => !requestedIds.has(id))) {
    return { error: "orderedIds must contain every current command exactly once" };
  }
  return { orderedIds: value };
}

router.get("/", (req, res) => {
  try {
    const profileId = typeof req.query.profileId === "string" ? req.query.profileId : undefined;
    if (profileId && !db.select().from(profiles).where(eq(profiles.id, profileId)).get()) {
      res.status(404).json({ error: "Profile not found" });
      return;
    }
    res.json(getEffectiveCommands(profileId));
  } catch (error) {
    console.error("Failed to fetch commands:", error);
    res.status(500).json({ error: "Failed to fetch commands" });
  }
});

router.get("/order/:profileId", (req, res) => {
  try {
    const profileId = req.params.profileId as string;
    if (!db.select().from(profiles).where(eq(profiles.id, profileId)).get()) {
      res.status(404).json({ error: "Profile not found" });
      return;
    }
    const orderedIds = getProfileOrder(profileId).map((item) => item.commandId);
    res.json({ usesDefault: orderedIds.length === 0, orderedIds });
  } catch (error) {
    console.error("Failed to fetch profile command order:", error);
    res.status(500).json({ error: "Failed to fetch profile command order" });
  }
});

router.put("/order", (req, res) => {
  try {
    const validation = validateOrderedIds(req.body?.orderedIds);
    if ("error" in validation) {
      res.status(400).json({ error: validation.error });
      return;
    }

    db.transaction((tx) => {
      validation.orderedIds.forEach((id, order) => {
        tx.update(commands).set({ order }).where(eq(commands.id, id)).run();
      });
    });
    res.json({ success: true });
    broadcastCommandsUpdate(req.app.get("io") as Server | undefined);
  } catch (error) {
    console.error("Failed to reorder commands:", error);
    res.status(500).json({ error: "Failed to reorder commands" });
  }
});

router.put("/order/:profileId", (req, res) => {
  try {
    const profileId = req.params.profileId as string;
    if (!db.select().from(profiles).where(eq(profiles.id, profileId)).get()) {
      res.status(404).json({ error: "Profile not found" });
      return;
    }
    const validation = validateOrderedIds(req.body?.orderedIds);
    if ("error" in validation) {
      res.status(400).json({ error: validation.error });
      return;
    }

    db.transaction((tx) => {
      tx.delete(profileCommandOrders).where(eq(profileCommandOrders.profileId, profileId)).run();
      if (validation.orderedIds.length > 0) {
        tx.insert(profileCommandOrders)
          .values(validation.orderedIds.map((commandId, order) => ({ profileId, commandId, order })))
          .run();
      }
    });
    res.json({ success: true });
    broadcastCommandsUpdate(req.app.get("io") as Server | undefined);
  } catch (error) {
    console.error("Failed to save profile command order:", error);
    res.status(500).json({ error: "Failed to save profile command order" });
  }
});

router.delete("/order/:profileId", (req, res) => {
  try {
    const profileId = req.params.profileId as string;
    if (!db.select().from(profiles).where(eq(profiles.id, profileId)).get()) {
      res.status(404).json({ error: "Profile not found" });
      return;
    }
    db.delete(profileCommandOrders).where(eq(profileCommandOrders.profileId, profileId)).run();
    res.json({ success: true });
    broadcastCommandsUpdate(req.app.get("io") as Server | undefined);
  } catch (error) {
    console.error("Failed to reset profile command order:", error);
    res.status(500).json({ error: "Failed to reset profile command order" });
  }
});

router.post("/", (req, res) => {
  try {
    const { emoji, label } = req.body;
    if (!emoji || !label) {
      res.status(400).json({ error: "emoji and label are required" });
      return;
    }
    const id = nanoid();
    const maxOrder =
      db
        .select({ value: max(commands.order) })
        .from(commands)
        .get()?.value ?? -1;
    db.insert(commands)
      .values({ id, emoji, label, isDefault: false, order: maxOrder + 1 })
      .run();
    const created = db.select().from(commands).where(eq(commands.id, id)).get();
    res.status(201).json(created);
    broadcastCommandsUpdate(req.app.get("io") as Server | undefined);
  } catch (error) {
    console.error("Failed to create command:", error);
    res.status(500).json({ error: "Failed to create command" });
  }
});

router.delete("/:id", (req, res) => {
  try {
    const { id } = req.params;
    const existing = db.select().from(commands).where(eq(commands.id, id)).get();
    if (!existing) {
      res.status(404).json({ error: "Command not found" });
      return;
    }
    db.delete(commands).where(eq(commands.id, id)).run();
    res.json({ success: true });
    broadcastCommandsUpdate(req.app.get("io") as Server | undefined);
  } catch (error) {
    console.error("Failed to delete command:", error);
    res.status(500).json({ error: "Failed to delete command" });
  }
});

router.post("/reset", (req, res) => {
  try {
    db.transaction((tx) => {
      tx.delete(profileCommandOrders).run();
      tx.delete(commands).run();
      tx.insert(commands)
        .values(
          defaultCommands.map((command, order) => ({
            id: nanoid(),
            ...command,
            isDefault: true,
            order,
          })),
        )
        .run();
    });
    res.json(getGlobalCommands());
    broadcastCommandsUpdate(req.app.get("io") as Server | undefined);
  } catch (error) {
    console.error("Failed to reset commands:", error);
    res.status(500).json({ error: "Failed to reset commands" });
  }
});

export default router;
