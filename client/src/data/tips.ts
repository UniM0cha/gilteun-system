export interface FeatureTipStep {
  title: string;
  description: string;
  imageSrc?: string;
  imageAlt?: string;
}

export interface FeatureTip {
  id: string;
  category: string;
  title: string;
  description: string;
  imageSrc: string;
  imageAlt: string;
  isNew?: boolean;
  steps?: readonly FeatureTipStep[];
}

export const FEATURE_TIPS: readonly FeatureTip[] = [
  {
    id: "auto-sheet-title",
    category: "새 기능",
    title: "악보 올리면 제목·코드 자동 채움",
    description: "악보 이미지를 올리면 AI가 곡 이름과 키(예: 우리들을 위하여 (A))를 읽어 자동으로 채워줍니다.",
    imageSrc: "/tips/auto-sheet-title.webp",
    imageAlt: "업로드된 악보 제목이 '우리들을 위하여 (A)'로 자동 채워진 화면",
    isNew: true,
    steps: [
      {
        title: "악보 추가 버튼으로 이미지 선택",
        description:
          "JPG, PNG, HEIC 악보 여러 장을 한 번에 올릴 수 있습니다. 업로드 직후에는 파일명이 임시 제목으로 먼저 표시되고 백그라운드에서 제목과 코드를 읽습니다.",
        imageSrc: "/tips/auto-sheet-title-pending.webp",
        imageAlt: "악보 업로드 직후 제목과 코드를 인식 중인 화면",
      },
      {
        title: "제목·코드 자동 완성 확인",
        description: "몇 초 뒤 악보 카드의 제목이 '곡명 (키)' 형식으로 자동 업데이트됩니다.",
        imageSrc: "/tips/auto-sheet-title.webp",
        imageAlt: "인식 완료 후 '우리들을 위하여 (A)'로 바뀐 악보 카드",
      },
      {
        title: "인식 중에도 연필 버튼으로 바로 수정",
        description:
          "직접 원하는 제목이 있다면 연필 버튼을 눌러 바로 고칠 수 있습니다. 수동으로 저장한 제목은 AI 결과로 덮어쓰지 않습니다.",
        imageSrc: "/tips/auto-sheet-title-edit.webp",
        imageAlt: "연필 버튼을 눌러 악보 제목을 직접 수정하는 화면",
      },
    ],
  },
  {
    id: "auto-worship-title",
    category: "새 기능",
    title: "날짜·예배 유형 먼저 고르면 제목 자동 완성",
    description:
      "새 예배를 만들 때 날짜와 예배 유형을 선택하면 '2026년 11월 23일 주일 1부 예배'처럼 제목이 자동으로 채워집니다.",
    imageSrc: "/tips/auto-worship-title.webp",
    imageAlt: "예배 날짜와 유형 선택 후 예배 제목이 자동으로 채워진 화면",
    isNew: true,
    steps: [
      {
        title: "새 예배 만들기 화면 열기",
        description: "제목 입력칸을 비워둔 상태에서 먼저 예배 날짜와 예배 유형을 고릅니다.",
        imageSrc: "/tips/auto-worship-title-before.webp",
        imageAlt: "날짜 선택 전 비어 있는 예배 제목 입력칸 화면",
      },
      {
        title: "날짜·유형에 맞게 제목 자동 채움",
        description:
          "날짜나 예배 유형을 바꿀 때마다 제목이 맞춰서 갱신되며, 사용자가 직접 입력한 제목은 덮어쓰지 않습니다.",
        imageSrc: "/tips/auto-worship-title.webp",
        imageAlt: "날짜와 유형에 맞춰 제목이 자동 채워진 예배 정보 카드",
      },
    ],
  },
  {
    id: "profile-command-order",
    category: "맞춤 설정",
    title: "명령 버튼 순서를 내 프로필에 맞게 변경",
    description: "명령 설정에서 내 프로필을 고른 뒤 자주 쓰는 명령을 드래그하면 나만의 순서로 바꿀 수 있습니다.",
    imageSrc: "/tips/profile-command-order.webp",
    imageAlt: "명령 설정 화면에서 정렬 대상과 명령 순서를 관리하는 화면",
    steps: [
      {
        title: "정렬 대상에서 내 프로필 선택",
        description: "홈 하단 '명령 설정'으로 들어가 '전체 기본 순서' 대신 내 프로필을 선택합니다.",
      },
      {
        title: "드래그로 자주 쓰는 명령 위로 올리기",
        description: "변경한 순서는 내 프로필 화면에만 적용되므로 다른 팀원 화면에는 영향을 주지 않습니다.",
      },
    ],
  },
  {
    id: "device-panel-side",
    category: "기기 설정",
    title: "악보·명령 패널 좌우 위치 바꾸기",
    description: "홈 하단 기기 설정에서 예배 화면의 악보 목록과 명령 패널 위치를 좌우로 바꿀 수 있습니다.",
    imageSrc: "/tips/device-panel-side.webp",
    imageAlt: "기기 설정에서 명령 패널 왼쪽/오른쪽 배치를 선택하는 화면",
    steps: [
      {
        title: "이 기기에만 적용되는 화면 배치",
        description:
          "설정은 서버가 아닌 현재 기기에만 저장되므로 왼손·오른손 편한 쪽으로 자유롭게 맞춰 쓸 수 있습니다.",
      },
    ],
  },
  {
    id: "palm-rejection",
    category: "필기 팁",
    title: "애플 펜슬 팜 리젝션 (펜으로만 그리기)",
    description:
      "아이패드에서 애플 펜슬로 한 번 그리면 '펜으로만 그리기'가 자동 활성화되어 손바닥이 닿아도 선이 그어지지 않습니다.",
    imageSrc: "/tips/palm-rejection.webp",
    imageAlt: "기기 설정의 펜으로만 그리기 토글 카드 화면",
    steps: [
      {
        title: "펜슬 없는 기기에서 그려지지 않을 때",
        description:
          "홈 하단 '기기 설정' 또는 예배 화면 그리기 도구 팝오버에서 '펜으로만 그리기'를 언제든 끄고 켤 수 있습니다.",
      },
    ],
  },
  {
    id: "drawing-tools",
    category: "필기 팁",
    title: "형광펜 · 여백 필기 · 드래그 지우개",
    description: "그리기 모드에서 도구 버튼을 누르면 형광펜, 색상, 굵기, 영역·획 지우개를 한 번에 고를 수 있습니다.",
    imageSrc: "/tips/drawing-tools.webp",
    imageAlt: "예배 화면에서 그리기 도구 팝오버가 열린 화면",
    steps: [
      {
        title: "형광펜 & 여백 필기",
        description: "악보 글자가 비쳐 보이는 전용 형광펜을 고르고, 악보 바깥 흰 여백에도 자유롭게 메모할 수 있습니다.",
      },
      {
        title: "드래그로 여러 획 한꺼번에 지우기",
        description: "획 지우개를 고른 뒤 누른 채로 드래그하면 지나가는 필기를 연속으로 지울 수 있습니다.",
      },
    ],
  },
] as const;

export const LATEST_TIP_VERSION = FEATURE_TIPS[0].id;
