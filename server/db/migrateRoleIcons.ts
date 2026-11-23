import { sqlite } from ".";

const NAME_KEYWORD_RULES: Array<[RegExp, string]> = [
  [/일렉|electric/i, "icon:guitar-electric"],
  [/베이스|bass/i, "icon:clef-bass"],
  [/어쿠스틱|통기타|기타|acoustic|guitar/i, "icon:guitar-acoustic"],
  [/바이올린|첼로|비올라|현악|violin|cello|string/i, "icon:violin"],
  [/세컨|신디|신스|synth/i, "icon:keyboard-music"],
  [/건반|피아노|반주|piano|key/i, "icon:piano"],
  [/드럼|drum/i, "icon:drum"],
  [/퍼커션|카혼|percussion|cajon/i, "icon:metronome"],
  [/인도|워십리더|leader/i, "icon:mic-vocal"],
  [/보컬|싱어|찬양|성가|합창|vocal|singer|choir/i, "icon:music"],
  [/목사|전도사|강도사|설교|말씀|pastor/i, "icon:book-open-text"],
  [/사회|진행|mc/i, "icon:lectern"],
  [/음향|믹싱|엔지니어|pa|sound|audio/i, "icon:sliders-vertical"],
  [/자막|ppt|프로젝터|slide/i, "icon:monitor"],
  [/영상|중계|방송|미디어|video|media/i, "icon:video"],
  [/촬영|카메라|사진|camera|photo/i, "icon:camera"],
  [/팀장|임원|대표/i, "icon:crown"],
  [/안내|봉사|섬김/i, "icon:hand-heart"],
];

const EMOJI_FALLBACK_MAP: Record<string, string> = {
  "🎤": "icon:mic-vocal",
  "🎹": "icon:piano",
  "🥁": "icon:drum",
  "🎸": "icon:guitar-acoustic",
  "🎻": "icon:violin",
  "🎵": "icon:music",
  "🎶": "icon:music",
  "🎼": "icon:music",
  "📖": "icon:book-open-text",
  "📚": "icon:book-open-text",
  "⛪": "icon:church",
  "🎧": "icon:headphones",
  "🎛": "icon:sliders-vertical",
  "🎛️": "icon:sliders-vertical",
  "🔊": "icon:speaker",
  "🖥": "icon:monitor",
  "🖥️": "icon:monitor",
  "💻": "icon:monitor",
  "📹": "icon:video",
  "🎥": "icon:video",
  "📷": "icon:camera",
  "👑": "icon:crown",
  "🙌": "icon:hand-heart",
  "🙏": "icon:hand-heart",
  "❤️": "icon:hand-heart",
  "✨": "icon:sparkles",
  "⭐": "icon:sparkles",
  "🔔": "icon:bell",
  "📢": "icon:megaphone",
  "📣": "icon:megaphone",
};

/** 역할 이름과 기존 이모지 아이콘을 기반으로 적절한 `icon:*` 키를 결정한다. */
export function resolveRoleIcon(name: string, currentIcon: string): string {
  if (currentIcon.startsWith("icon:")) {
    return currentIcon;
  }

  const trimmedName = name.trim();
  for (const [pattern, iconId] of NAME_KEYWORD_RULES) {
    if (pattern.test(trimmedName)) {
      return iconId;
    }
  }

  const trimmedIcon = currentIcon.trim();
  if (trimmedIcon && EMOJI_FALLBACK_MAP[trimmedIcon]) {
    return EMOJI_FALLBACK_MAP[trimmedIcon];
  }

  return "icon:users";
}

/** 기존 DB의 이모지 역할 아이콘을 `icon:*` 키로 1회 자동 변환한다. */
export function migrateLegacyRoleIcons(): number {
  const legacyRows = sqlite.prepare(`SELECT id, name, icon FROM roles WHERE icon NOT LIKE 'icon:%'`).all() as Array<{
    id: string;
    name: string;
    icon: string;
  }>;

  if (legacyRows.length === 0) {
    return 0;
  }

  const updateStmt = sqlite.prepare(`UPDATE roles SET icon = ? WHERE id = ?`);
  sqlite.transaction(() => {
    for (const row of legacyRows) {
      updateStmt.run(resolveRoleIcon(row.name, row.icon), row.id);
    }
  })();

  console.log(`[migrate-roles] 기존 이모지 역할 ${legacyRows.length}건을 아이콘 키로 변환했습니다.`);
  return legacyRows.length;
}
