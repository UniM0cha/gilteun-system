export const queryKeys = {
  auth: {
    status: ["auth", "status"] as const,
  },
  profiles: {
    all: ["profiles"] as const,
  },
  roles: {
    all: ["roles"] as const,
  },
  worshipTypes: {
    all: ["worshipTypes"] as const,
  },
  worships: {
    all: ["worships"] as const,
    // 무한 스크롤 목록 — 필터 상태를 key에 포함. all의 prefix라 기존 invalidate가 자동 커버
    list: (filters: { typeId?: string; q?: string; year?: string; month?: string; limit?: number }) =>
      ["worships", "list", filters] as const,
    // 연도 목록 — worships prefix 아래 둬서 예배 mutation의 invalidate(["worships"])에 자동 포함
    years: ["worships", "years"] as const,
    detail: (id: string) => ["worships", id] as const,
  },
  commands: {
    all: ["commands"] as const,
  },
  drawings: {
    bySheet: (sheetId: string) => ["drawings", sheetId] as const,
  },
} as const;
