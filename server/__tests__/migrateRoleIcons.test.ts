import { describe, expect, it } from "vitest";
import { resolveRoleIcon } from "../db/migrateRoleIcons.js";

describe("resolveRoleIcon", () => {
  it("이미 icon: 접두사가 있으면 그대로 유지한다", () => {
    expect(resolveRoleIcon("기타", "icon:guitar-electric")).toBe("icon:guitar-electric");
    expect(resolveRoleIcon("커스텀", "icon:sparkles")).toBe("icon:sparkles");
  });

  it("역할 이름 키워드에 맞는 아이콘 키를 우선 매핑한다", () => {
    expect(resolveRoleIcon("인도자", "🎤")).toBe("icon:mic-vocal");
    expect(resolveRoleIcon("메인건반", "🎹")).toBe("icon:piano");
    expect(resolveRoleIcon("세컨건반", "🎹")).toBe("icon:keyboard-music");
    expect(resolveRoleIcon("드럼", "🥁")).toBe("icon:drum");
    expect(resolveRoleIcon("기타", "🎸")).toBe("icon:guitar-acoustic");
    expect(resolveRoleIcon("어쿠스틱", "🎸")).toBe("icon:guitar-acoustic");
    expect(resolveRoleIcon("일렉", "🎸")).toBe("icon:guitar-electric");
    expect(resolveRoleIcon("베이스", "🎸")).toBe("icon:clef-bass");
    expect(resolveRoleIcon("바이올린", "🎻")).toBe("icon:violin");
    expect(resolveRoleIcon("보컬", "🎵")).toBe("icon:music");
    expect(resolveRoleIcon("목사님", "📖")).toBe("icon:book-open-text");
    expect(resolveRoleIcon("음향", "🎧")).toBe("icon:sliders-vertical");
    expect(resolveRoleIcon("자막", "💻")).toBe("icon:monitor");
    expect(resolveRoleIcon("방송", "📹")).toBe("icon:video");
  });

  it("이름으로 매칭되지 않으면 기존 이모지를 기반으로 변환한다", () => {
    expect(resolveRoleIcon("스페셜", "✨")).toBe("icon:sparkles");
    expect(resolveRoleIcon("팀원A", "🎸")).toBe("icon:guitar-acoustic");
  });

  it("매칭되는 키워드와 이모지가 모두 없으면 기본 아이콘(icon:users)을 반환한다", () => {
    expect(resolveRoleIcon("기타역할", "🫥")).not.toBe("icon:users"); // "기타" 키워드 매칭
    expect(resolveRoleIcon("스태프", "🫥")).toBe("icon:users");
  });
});
