// 드로잉 좌표계 전환용 순수 변환 함수.
//
// 기존 stroke 좌표는 "악보 이미지가 object-contain으로 차지하는 영역(letterbox)" 기준 0~1로
// 저장돼 있다. 그리기 영역을 "캔버스(흰 카드) 전체"로 넓히면서, 기존 획의 화면상 위치·굵기를
// 그대로 보존하려면 letterbox 기준 좌표를 카드 전체 기준 좌표로 환산해야 한다.
//
// 흰 카드는 항상 3:4 비율로 고정돼 있으므로, letterbox와 카드 전체의 관계는 이미지 종횡비
// (imageAspect = 이미지 가로/세로)만으로 결정된다.
//
// DB 작업이 없는 순수 함수로 분리해 단위 테스트가 가능하게 한다.

export interface Point {
  x: number;
  y: number;
}

/** 흰 악보 카드의 고정 종횡비 (가로/세로). client/src/pages/Worship.tsx의 SHEET_CARD_SIZE_STYLE과 일치. */
export const CARD_ASPECT = 3 / 4;

export interface ConvertResult {
  points: Point[];
  width: number;
}

/**
 * letterbox(이미지 영역) 기준 0~1 좌표를 카드 전체 기준 0~1 좌표로 변환한다.
 * 변환 후 좌표를 카드 전체에 denormalize하면, 변환 전 좌표를 letterbox에 denormalize한
 * 화면 위치와 정확히 일치한다(위치 보존). 굵기도 화면 픽셀 두께가 보존된다.
 *
 * imageAspect === cardAspect(정확히 3:4)이거나 과거 FALLBACK(3:4)로 저장된 좌표는 항등 변환.
 */
export function convertPathToCardBasis(
  points: Point[],
  width: number,
  imageAspect: number,
  cardAspect: number = CARD_ASPECT,
): ConvertResult {
  // 카드(0~1 정규화 공간) 안에서 letterbox가 차지하는 위치/크기.
  let letterboxWidthN: number;
  let letterboxHeightN: number;
  let offsetXN: number;
  let offsetYN: number;

  if (cardAspect > imageAspect) {
    // 이미지가 카드보다 세로로 길다 → 좌우에 레터박스(여백)
    letterboxWidthN = imageAspect / cardAspect;
    letterboxHeightN = 1;
    offsetXN = (1 - letterboxWidthN) / 2;
    offsetYN = 0;
  } else {
    // 이미지가 카드보다 가로로 넓다(또는 동일) → 상하에 레터박스
    letterboxWidthN = 1;
    letterboxHeightN = cardAspect / imageAspect;
    offsetXN = 0;
    offsetYN = (1 - letterboxHeightN) / 2;
  }

  return {
    points: points.map((p) => ({
      x: offsetXN + p.x * letterboxWidthN,
      y: offsetYN + p.y * letterboxHeightN,
    })),
    // 굵기는 letterbox 가로 폭 기준으로 정규화돼 있으므로 가로 스케일만 적용하면
    // 화면 픽셀 두께가 보존된다(렌더의 width * drawRect.width와 동일 기준).
    width: width * letterboxWidthN,
  };
}
