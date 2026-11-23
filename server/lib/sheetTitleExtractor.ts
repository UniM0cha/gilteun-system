import sharp from "sharp";

const GEMINI_API_BASE_URL = "https://generativelanguage.googleapis.com/v1beta/models";
const DEFAULT_GEMINI_MODEL = "gemini-3.5-flash-lite";
const REQUEST_TIMEOUT_MS = 20_000;
const MAX_IMAGE_DIMENSION = 1280;
const MAX_TITLE_LENGTH = 120;
const MAX_MODULATION_SEGMENTS = 3;

const EXTRACTION_PROMPT = [
  "이 이미지는 교회 예배에서 사용하는 악보입니다. 이미지에서 곡 제목(songTitle), 조표(keySignature), 시작·끝 코드(chordEvidence), 그리고 최종 조성(key)을 추출하세요.",
  "",
  "규칙:",
  "1. songTitle:",
  "   - 악보 상단에 적힌 메인 곡 제목을 원문 언어 그대로 정확히 추출하세요.",
  '   - 제목 아래/옆에 괄호로 적힌 부제(예: "(내 마음의 한 자리)", "(찬송가 252장)"), 작사/작곡가, 찬송가 장 번호(예: "259"), 코드/키 표기, 페이지 번호, 출처/워터마크(예: KaMU, Kang Score, 악보바다 등)는 제외하세요.',
  "   - 이미지가 악보가 아니거나 제목이 전혀 적혀 있지 않거나(예: 제목 없는 2페이지) 글자가 흐려 판독할 수 없으면 억지로 추측하지 말고 null을 반환하세요.",
  "2. keySignature & chordEvidence:",
  "   - 먼저 첫 번째 오선지 음자리표 옆의 조표(♯ 또는 ♭의 정확한 개수)와 곡의 시작 코드, 주요 종지 코드(V→I), 마지막/Fine 코드를 주의 깊게 읽으세요.",
  "3. key:",
  "   - 조표(♯/♭ 개수)와 코드 진행(시작·종지·마지막 코드, 특히 I-IV-V-vi)을 반드시 일치시켜 최종 장조/단조 조성을 확정하세요. (예: ♯ 3개 + A·E·D·A 종지 → A, ♭ 1개 + Gm7-C7-F 또는 Bb-C-F → F).",
  "   - 표기는 반드시 표준 영문 조성 형식을 사용하세요: 장조는 C, G, D, A, E, B, F, Bb, Eb, Ab, Db, Gb, F#, C# / 단조는 Am, Em, Dm, F#m, Bm, Cm, Gm 등 (플랫은 b, 샵은 # 사용).",
  "   - 곡 중간에 전조(키 업 등)가 일어나면 'G→A', 'F→G'처럼 화살표(→)로 이어서 표기하세요.",
  "   - 조표나 코드 정보가 전혀 없어 조성을 판단할 수 없으면 null을 반환하세요.",
].join("\n");

export interface ExtractedSheetMetadata {
  songTitle?: string | null;
  key?: string | null;
}

export interface ExtractSheetTitleOptions {
  apiKey: string;
  model?: string;
  signal?: AbortSignal;
  fetchImpl?: typeof fetch;
}

interface GeminiGenerateContentResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string;
        thought?: boolean;
      }>;
    };
  }>;
}

/**
 * Gemini가 반환한 조성 문자열을 표준 표기(`C`, `Bb`, `F#m`, `G→A`)로 정규화한다.
 * 유효한 조성이 아니거나 세그먼트 수가 초과하면 `null`을 반환한다.
 */
export function normalizeMusicalKey(rawKey: string | null | undefined): string | null {
  if (!rawKey || typeof rawKey !== "string") return null;

  const normalizedArrows = rawKey
    .replaceAll("♭", "b")
    .replaceAll("♯", "#")
    .replace(/\s*(?:->|=>|–>|—>|⟶|➜|→)\s*/g, "→")
    .trim();

  if (!normalizedArrows) return null;

  const rawParts = normalizedArrows.split("→");
  if (rawParts.length === 0 || rawParts.length > MAX_MODULATION_SEGMENTS) {
    return null;
  }

  const normalizedSegments: string[] = [];

  for (const part of rawParts) {
    let segment = part.trim();
    segment = segment.replace(/^(?:key(?:\s+of)?|키)\s*[:=-]?\s*/i, "");
    segment = segment.replace(/\s*[:=-]?\s*(?:key|키)$/i, "");

    let isMinor = false;
    if (/[\s-]*(?:minor|min|단조)$/i.test(segment)) {
      isMinor = true;
      segment = segment.replace(/[\s-]*(?:minor|min|단조)$/i, "").trim();
    } else if (/[\s-]*(?:major|maj|장조)$/i.test(segment)) {
      segment = segment.replace(/[\s-]*(?:major|maj|장조)$/i, "").trim();
    }

    const match = segment.match(/^([A-Ga-g])([#b]?)\s*(m)?$/);
    if (!match) {
      return null;
    }

    const root = match[1].toUpperCase();
    const accidental = match[2];
    const minorSuffix = isMinor || match[3] === "m" ? "m" : "";
    const canonical = `${root}${accidental}${minorSuffix}`;

    if (!/^[A-G][#b]?m?$/.test(canonical)) {
      return null;
    }

    // G→G 같은 중복 전조 표기는 하나로 축약
    if (normalizedSegments[normalizedSegments.length - 1] !== canonical) {
      normalizedSegments.push(canonical);
    }
  }

  return normalizedSegments.length > 0 ? normalizedSegments.join("→") : null;
}

/**
 * 추출된 곡 제목과 조성 정보를 `곡명 (키)` 형식으로 조합한다.
 */
export function formatExtractedSheetTitle(result: ExtractedSheetMetadata): string | null {
  const cleanTitle = result.songTitle?.replace(/\s+/g, " ").trim() ?? "";
  if (!cleanTitle) return null;

  const cleanKey = normalizeMusicalKey(result.key);
  if (!cleanKey) {
    return cleanTitle.slice(0, MAX_TITLE_LENGTH).trim() || null;
  }

  // 곡 제목 끝에 이미 같은 (키)가 포함되어 있으면 중복 추가하지 않음
  const trailingParen = cleanTitle.match(/\s*\(([^()]+)\)\s*$/);
  if (trailingParen && normalizeMusicalKey(trailingParen[1]) === cleanKey) {
    return cleanTitle.slice(0, MAX_TITLE_LENGTH).trim();
  }

  const suffix = ` (${cleanKey})`;
  const combined = `${cleanTitle}${suffix}`;
  if (combined.length <= MAX_TITLE_LENGTH) {
    return combined;
  }

  const maxSongLength = MAX_TITLE_LENGTH - suffix.length;
  if (maxSongLength <= 0) {
    return cleanTitle.slice(0, MAX_TITLE_LENGTH).trim();
  }

  return `${cleanTitle.slice(0, maxSongLength).trim()}${suffix}`;
}

async function preprocessSheetImage(imagePath: string): Promise<Buffer> {
  return sharp(imagePath)
    .rotate()
    .resize({
      width: MAX_IMAGE_DIMENSION,
      height: MAX_IMAGE_DIMENSION,
      fit: "inside",
      withoutEnlargement: true,
    })
    .jpeg({ quality: 82 })
    .toBuffer();
}

function parseGeminiJsonPayload(rawText: string): ExtractedSheetMetadata {
  const cleaned = rawText
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
  const parsed: unknown = JSON.parse(cleaned);
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("Gemini response JSON is not an object");
  }
  const record = parsed as Record<string, unknown>;
  return {
    songTitle: typeof record.songTitle === "string" ? record.songTitle : null,
    key: typeof record.key === "string" ? record.key : null,
  };
}

/**
 * 악보 이미지 파일에서 Gemini 비전 모델을 이용해 `곡명 (키)` 형식의 제목을 추출한다.
 */
export async function extractSheetTitleFromImage(
  imagePath: string,
  options: ExtractSheetTitleOptions,
): Promise<string | null> {
  const { apiKey, model = DEFAULT_GEMINI_MODEL, signal, fetchImpl = fetch } = options;
  signal?.throwIfAborted();

  const imageBuffer = await preprocessSheetImage(imagePath);
  signal?.throwIfAborted();

  const timeoutSignal = AbortSignal.timeout(REQUEST_TIMEOUT_MS);
  const requestSignal = signal ? AbortSignal.any([signal, timeoutSignal]) : timeoutSignal;

  const endpoint = `${GEMINI_API_BASE_URL}/${encodeURIComponent(model)}:generateContent`;
  const response = await fetchImpl(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": apiKey,
    },
    signal: requestSignal,
    body: JSON.stringify({
      contents: [
        {
          parts: [
            {
              inlineData: {
                mimeType: "image/jpeg",
                data: imageBuffer.toString("base64"),
              },
            },
            {
              text: EXTRACTION_PROMPT,
            },
          ],
        },
      ],
      generationConfig: {
        temperature: 0,
        responseMimeType: "application/json",
        responseSchema: {
          type: "OBJECT",
          properties: {
            songTitle: { type: "STRING", nullable: true },
            keySignature: { type: "STRING", nullable: true },
            chordEvidence: { type: "STRING", nullable: true },
            key: { type: "STRING", nullable: true },
          },
          required: ["songTitle", "keySignature", "chordEvidence", "key"],
        },
      },
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text().catch(() => "");
    throw new Error(`Gemini API request failed (${response.status}): ${errorBody.slice(0, 300)}`);
  }

  const data = (await response.json()) as GeminiGenerateContentResponse;
  const text = data.candidates?.[0]?.content?.parts
    ?.filter((part) => !part.thought)
    .map((part) => part.text ?? "")
    .join("")
    .trim();

  if (!text) {
    return null;
  }

  const extracted = parseGeminiJsonPayload(text);
  return formatExtractedSheetTitle(extracted);
}
