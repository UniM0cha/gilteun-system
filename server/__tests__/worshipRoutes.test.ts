import { beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import { db } from "../db";
import { drawingPaths, sheets, worships, worshipTypes } from "../db/schema.js";
import { config } from "../config.js";
import { createApiApp } from "./helpers/createApiApp.js";

const app = createApiApp();

describe("Worship routes", () => {
  beforeEach(() => {
    config.authPin = null;
    db.delete(drawingPaths).run();
    db.delete(sheets).run();
    db.delete(worships).run();
    db.delete(worshipTypes).run();
    db.insert(worshipTypes).values({ id: "type-1", name: "주일", color: "bg-primary" }).run();
  });

  it("정확한 YYYY-MM-DD 날짜로 예배를 생성한다", async () => {
    const response = await request(app)
      .post("/api/worships")
      .send({ title: "윤년 예배", date: "2024-02-29", typeId: "type-1" });

    expect(response.status).toBe(201);
    expect(response.body.date).toBe("2024-02-29");
  });

  it.each(["2024-1-7", "2024/01/07", "2026-02-30", "2023-02-29", "asdf", 20240107, []])(
    "잘못된 생성 날짜 %j를 거절한다",
    async (date) => {
      const response = await request(app).post("/api/worships").send({ title: "테스트", date, typeId: "type-1" });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe("date must be a valid YYYY-MM-DD date");
      expect(db.select().from(worships).all()).toHaveLength(0);
    },
  );

  it("PUT은 날짜 생략을 허용하고 잘못된 날짜 변경은 거절한다", async () => {
    db.insert(worships)
      .values({
        id: "worship-1",
        title: "기존 예배",
        date: "2026-08-14",
        typeId: "type-1",
        createdAt: "2026-08-14T00:00:00.000Z",
        updatedAt: "2026-08-14T00:00:00.000Z",
      })
      .run();

    const titleOnly = await request(app).put("/api/worships/worship-1").send({ title: "수정 예배" });
    expect(titleOnly.status).toBe(200);
    expect(titleOnly.body.date).toBe("2026-08-14");

    const invalidDate = await request(app).put("/api/worships/worship-1").send({ date: "2026-2-30" });
    expect(invalidDate.status).toBe(400);
    expect(db.select().from(worships).get()?.date).toBe("2026-08-14");
  });

  it("연·월 필터와 연도 목록은 저장 계약을 기준으로 동작한다", async () => {
    db.insert(worships)
      .values([
        {
          id: "worship-1",
          title: "1월 예배",
          date: "2025-01-07",
          typeId: "type-1",
          createdAt: "2025-01-07T00:00:00.000Z",
          updatedAt: "2025-01-07T00:00:00.000Z",
        },
        {
          id: "worship-2",
          title: "2월 예배",
          date: "2026-02-01",
          typeId: "type-1",
          createdAt: "2026-02-01T00:00:00.000Z",
          updatedAt: "2026-02-01T00:00:00.000Z",
        },
      ])
      .run();

    const list = await request(app).get("/api/worships?year=2025&month=1");
    expect(list.status).toBe(200);
    expect(list.body.items.map((item: { id: string }) => item.id)).toEqual(["worship-1"]);

    const years = await request(app).get("/api/worships/years");
    expect(years.status).toBe(200);
    expect(years.body).toEqual([2026, 2025]);
  });
});
