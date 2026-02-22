export const queryKeys = {
  profiles: {
    all: ['profiles'] as const,
  },
  roles: {
    all: ['roles'] as const,
  },
  worshipTypes: {
    all: ['worshipTypes'] as const,
  },
  worships: {
    all: ['worships'] as const,
    detail: (id: string) => ['worships', id] as const,
  },
  commands: {
    all: ['commands'] as const,
  },
} as const;
