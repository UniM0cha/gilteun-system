import { beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import { asc, eq } from "drizzle-orm";
import { db } from "../db";
import { commands, profileCommandOrders, profiles, roles } from "../db/schema.js";
import { config } from "../config.js";
import { createApiApp } from "./helpers/createApiApp.js";

const app = createApiApp();

function commandIds() {
  return db
    .select()
    .from(commands)
    .orderBy(asc(commands.order))
    .all()
    .map((command) => command.id);
}

describe("Command routes", () => {
  beforeEach(() => {
    config.authPin = null;
    db.delete(profileCommandOrders).run();
    db.delete(commands).run();
    db.delete(profiles).run();
    db.delete(roles).run();
    db.insert(roles).values({ id: "role-1", name: "인도자", icon: "🎤" }).run();
    db.insert(profiles)
      .values([
        { id: "profile-1", name: "재석", roleId: "role-1", color: "bg-primary" },
        { id: "profile-2", name: "다른 사용자", roleId: "role-1", color: "bg-secondary" },
      ])
      .run();
    db.insert(commands)
      .values([
        { id: "a", emoji: "1️⃣", label: "1절", isDefault: true, order: 0 },
        { id: "b", emoji: "2️⃣", label: "2절", isDefault: true, order: 1 },
        { id: "c", emoji: "▶️", label: "시작", isDefault: true, order: 2 },
      ])
      .run();
  });

  it("전체 기본 순서를 원자적으로 저장한다", async () => {
    const response = await request(app)
      .put("/api/commands/order")
      .send({ orderedIds: ["c", "a", "b"] });

    expect(response.status).toBe(200);
    expect(commandIds()).toEqual(["c", "a", "b"]);
    expect((await request(app).get("/api/commands")).body.map((item: { id: string }) => item.id)).toEqual([
      "c",
      "a",
      "b",
    ]);
  });

  it.each([{ orderedIds: ["a", "a", "c"] }, { orderedIds: ["a", "b"] }, { orderedIds: ["a", "b", "missing"] }])(
    "잘못된 전체 순서 %j를 거절하고 기존 순서를 보존한다",
    async ({ orderedIds }) => {
      const response = await request(app).put("/api/commands/order").send({ orderedIds });

      expect(response.status).toBe(400);
      expect(commandIds()).toEqual(["a", "b", "c"]);
    },
  );

  it("개인 순서가 없는 프로필은 기본 순서를 상속하고 개인 순서를 따로 저장한다", async () => {
    const inherited = await request(app).get("/api/commands?profileId=profile-1");
    expect(inherited.body.map((item: { id: string }) => item.id)).toEqual(["a", "b", "c"]);

    const saved = await request(app)
      .put("/api/commands/order/profile-1")
      .send({ orderedIds: ["b", "c", "a"] });
    expect(saved.status).toBe(200);

    const personalized = await request(app).get("/api/commands?profileId=profile-1");
    const otherProfile = await request(app).get("/api/commands?profileId=profile-2");
    expect(personalized.body.map((item: { id: string }) => item.id)).toEqual(["b", "c", "a"]);
    expect(otherProfile.body.map((item: { id: string }) => item.id)).toEqual(["a", "b", "c"]);
    expect((await request(app).get("/api/commands/order/profile-1")).body.usesDefault).toBe(false);
  });

  it("개인 순서를 기본 순서로 되돌린다", async () => {
    await request(app)
      .put("/api/commands/order/profile-1")
      .send({ orderedIds: ["c", "b", "a"] });

    const reset = await request(app).delete("/api/commands/order/profile-1");

    expect(reset.status).toBe(200);
    expect(
      (await request(app).get("/api/commands?profileId=profile-1")).body.map((item: { id: string }) => item.id),
    ).toEqual(["a", "b", "c"]);
    expect((await request(app).get("/api/commands/order/profile-1")).body.usesDefault).toBe(true);
  });

  it("개인 순서 이후 추가된 명령은 마지막에 표시되고 삭제 시 개인 순서에서도 제거된다", async () => {
    await request(app)
      .put("/api/commands/order/profile-1")
      .send({ orderedIds: ["c", "a", "b"] });
    const created = await request(app).post("/api/commands").send({ emoji: "⏹️", label: "정지" });

    expect(created.status).toBe(201);
    const withNewCommand = await request(app).get("/api/commands?profileId=profile-1");
    expect(withNewCommand.body.map((item: { id: string }) => item.id)).toEqual(["c", "a", "b", created.body.id]);

    await request(app).delete("/api/commands/a");
    expect(db.select().from(profileCommandOrders).where(eq(profileCommandOrders.commandId, "a")).all()).toHaveLength(0);
  });

  it("명령 초기화는 개인 순서도 함께 삭제한다", async () => {
    await request(app)
      .put("/api/commands/order/profile-1")
      .send({ orderedIds: ["c", "a", "b"] });

    const response = await request(app).post("/api/commands/reset");

    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(11);
    expect(db.select().from(profileCommandOrders).all()).toHaveLength(0);
  });
});
