// @vitest-environment happy-dom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { ROLE_ICON_PRESETS, RoleIcon, isRoleIconId } from "./RoleIcon";

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => {
    root.unmount();
  });
  container.remove();
});

describe("RoleIcon", () => {
  it("모든 프리셋 ID는 유일하고 icon: 접두사를 가진다", () => {
    const ids = ROLE_ICON_PRESETS.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) {
      expect(id.startsWith("icon:")).toBe(true);
      expect(isRoleIconId(id)).toBe(true);
    }
  });

  it("Lucide 프리셋과 커스텀 SVG 5종을 SVG 요소로 렌더링한다", () => {
    const iconIds = [
      "icon:piano",
      "icon:guitar-acoustic",
      "icon:guitar-electric",
      "icon:guitar-bass",
      "icon:clef-bass",
      "icon:violin",
    ];

    for (const id of iconIds) {
      act(() => {
        root.render(<RoleIcon icon={id} />);
      });
      const svg = container.querySelector("svg");
      expect(svg, `${id}가 svg로 렌더링되어야 함`).not.toBeNull();
    }
  });

  it("기존 DB에 저장된 이모지 문자열은 텍스트로 그대로 렌더링한다", () => {
    for (const emoji of ["🎹", "🎤", "🎸"]) {
      act(() => {
        root.render(<RoleIcon icon={emoji} />);
      });
      expect(container.querySelector("svg")).toBeNull();
      expect(container.textContent).toBe(emoji);
      expect(isRoleIconId(emoji)).toBe(false);
    }
  });

  it("빈 값이면 아무것도 렌더링하지 않는다", () => {
    act(() => {
      root.render(<RoleIcon icon="" />);
    });
    expect(container.innerHTML).toBe("");
  });
});
