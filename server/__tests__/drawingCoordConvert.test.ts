import { describe, it, expect } from "vitest";
import { convertPathToCardBasis, CARD_ASPECT, type Point } from "../db/drawingCoordConvert.js";

// 변환의 핵심 불변: letterbox(이미지 영역) 기준 좌표를 카드 전체 기준으로 환산했을 때
// 화면상 위치와 굵기가 보존되어야 한다.
//
// 카드 크기를 W×H(3:4)로 두고:
//   변환 전 화면좌표 = letterboxRect 기준 denormalize
//   변환 후 화면좌표 = 카드 전체 기준 denormalize
// 두 값이 같아야 한다.

// 클라이언트의 (구) getContainedRect와 동일한 contain-fit 계산 (검증용 레퍼런스).
function containedRect(W: number, H: number, aspect: number) {
  const containerAspect = W / H;
  if (containerAspect > aspect) {
    const width = H * aspect;
    return { x: (W - width) / 2, y: 0, width, height: H };
  }
  const height = W / aspect;
  return { x: 0, y: (H - height) / 2, width: W, height };
}

describe("convertPathToCardBasis", () => {
  const W = 300;
  const H = 400; // 카드 3:4 (= CARD_ASPECT)

  it("이미지가 정확히 3:4면 좌표·굵기가 불변(항등)이다", () => {
    const points: Point[] = [
      { x: 0, y: 0 },
      { x: 0.5, y: 0.5 },
      { x: 1, y: 1 },
    ];
    const r = convertPathToCardBasis(points, 0.01, CARD_ASPECT);
    r.points.forEach((p, i) => {
      expect(p.x).toBeCloseTo(points[i].x, 10);
      expect(p.y).toBeCloseTo(points[i].y, 10);
    });
    expect(r.width).toBeCloseTo(0.01, 10);
  });

  it.each([
    ["세로로 긴 이미지 — 좌우 레터박스", 0.5],
    ["가로로 넓은 이미지 — 상하 레터박스", 1.5],
    ["A4에 가까운 비율", 0.707],
    ["거의 3:4지만 미세하게 다름", 0.74],
  ])("%s: 화면 위치와 굵기가 보존된다 (aspect=%s)", (_label, aspect) => {
    const lb = containedRect(W, H, aspect as number);
    const points: Point[] = [
      { x: 0, y: 0 },
      { x: 0.25, y: 0.75 },
      { x: 1, y: 1 },
      { x: 0.5, y: 0.5 },
    ];
    const thicknessN = 0.02;
    const r = convertPathToCardBasis(points, thicknessN, aspect as number);

    points.forEach((p, i) => {
      const beforeX = lb.x + p.x * lb.width;
      const beforeY = lb.y + p.y * lb.height;
      const afterX = r.points[i].x * W;
      const afterY = r.points[i].y * H;
      expect(afterX).toBeCloseTo(beforeX, 6);
      expect(afterY).toBeCloseTo(beforeY, 6);
    });

    // 굵기: 변환 전후 화면 픽셀 두께가 같아야 한다.
    const beforeThicknessPx = thicknessN * lb.width;
    const afterThicknessPx = r.width * W;
    expect(afterThicknessPx).toBeCloseTo(beforeThicknessPx, 6);
  });

  it("원본 points 배열을 변형하지 않는다(새 배열 반환)", () => {
    const points: Point[] = [{ x: 0.3, y: 0.3 }];
    const snapshot = JSON.stringify(points);
    convertPathToCardBasis(points, 0.01, 0.5);
    expect(JSON.stringify(points)).toBe(snapshot);
  });
});
