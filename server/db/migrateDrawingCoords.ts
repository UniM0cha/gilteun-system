// 일회성 데이터 마이그레이션: 기존 drawing_paths 좌표를 letterbox(이미지 영역) 기준에서
// 카드(캔버스) 전체 기준으로 환산해 화면상 위치·굵기를 보존한다.
//
// 그리기 영역을 흰 카드 전체로 넓히는 변경(client)에 맞춰, 이미 저장된 획이 어긋나지 않도록
// 한 번만 적용한다. 비가역 변환이므로 app_meta 플래그로 재실행을 막는다.
//
// 실행 경로 2가지:
//   1) 서버 부팅 시 자동 (index.ts가 runDrawingCoordMigration 호출) — 배포(재시작) 직후 클라이언트가
//      접속하기 전에 적용돼, 새 클라이언트가 card-basis로 저장한 획을 letterbox로 오인해 이중 변환하는
//      "배포~마이그레이션 창"을 없앤다. 멱등 플래그로 적용 후엔 즉시 스킵.
//   2) 수동 CLI: npm run db:migrate:draw

// CLI 직접 실행(npm run db:migrate:draw) 시 .env의 DB_PATH/UPLOADS_DIR을 반영하려면 config 로드 전에
// dotenv를 먼저 적용해야 한다. (부팅 경로는 index.ts가 먼저 로드하지만, 이 파일이 단독 진입점일 땐 아님.)
import "dotenv/config";
import sharp from "sharp";
import path from "path";
import fs from "fs";
import { pathToFileURL } from "url";
import { eq } from "drizzle-orm";
import { db, sqlite } from ".";
import { drawingPaths, sheets } from "./schema.js";
import { config } from "../config.js";
import { convertPathToCardBasis, type Point } from "./drawingCoordConvert.js";

const FLAG_KEY = "drawing_coords_card_basis";

export type MigrationResult =
  | { status: "already-applied"; appliedAt: string }
  | { status: "aborted"; unresolvedSheets: string[] }
  | { status: "done"; converted: number };

/** 이미지 파일의 종횡비(가로/세로)를 읽는다. 브라우저 naturalWidth/Height와 맞추려 EXIF orientation 보정. */
async function computeImageAspect(imagePathRel: string): Promise<number | null> {
  const file = path.join(config.uploadsDir, imagePathRel);
  if (!fs.existsSync(file)) {
    console.warn(`[migrate-draw] 이미지 파일 없음 → 미확인: ${file}`);
    return null;
  }
  try {
    const meta = await sharp(file).metadata();
    if (!meta.width || !meta.height) return null;
    let w = meta.width;
    let h = meta.height;
    // orientation 5~8 = 90/270도 회전 → 브라우저는 회전 적용 후 크기를 naturalWidth/Height로 보고하므로 swap.
    if (meta.orientation && meta.orientation >= 5) {
      [w, h] = [h, w];
    }
    return w / h;
  } catch (err) {
    console.warn(`[migrate-draw] 이미지 메타 읽기 실패 → 미확인: ${file}`, err);
    return null;
  }
}

/**
 * 좌표계 마이그레이션을 1회 적용한다(멱등). DB 연결(sqlite)을 닫지 않으므로 부팅 경로에서 그대로 쓸 수 있다.
 * - already-applied: 플래그가 있어 아무것도 하지 않음
 * - aborted: 한 시트라도 이미지 종횡비를 못 구해 전체 중단(DB 무변경) — 복구 후 재시도하면 적용됨
 * - done: 전체 변환 + 플래그 기록
 */
export async function runDrawingCoordMigration(): Promise<MigrationResult> {
  // 멱등 가드용 메타 테이블 보장 (setupDatabase와 별개로 자족적으로 생성).
  sqlite.exec(`CREATE TABLE IF NOT EXISTS app_meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);`);

  const flag = sqlite.prepare("SELECT value FROM app_meta WHERE key = ?").get(FLAG_KEY) as
    | { value: string }
    | undefined;
  if (flag) {
    return { status: "already-applied", appliedAt: flag.value };
  }

  const allPaths = db.select().from(drawingPaths).all();
  console.log(`[migrate-draw] 대상 drawing_paths: ${allPaths.length}개`);

  // 고유 sheetId별 이미지 종횡비를 비동기로 수집(sharp). better-sqlite3 트랜잭션은 동기라
  // 변환 단계 전에 미리 모아둔다.
  const sheetIds = [...new Set(allPaths.map((p) => p.sheetId))];
  const aspectBySheet = new Map<string, number | null>();
  await Promise.all(
    sheetIds.map(async (id) => {
      const sheet = db.select().from(sheets).where(eq(sheets.id, id)).get();
      aspectBySheet.set(id, sheet ? await computeImageAspect(sheet.imagePath) : null);
    }),
  );

  // all-or-nothing: 한 시트라도 종횡비를 못 구하면 전체 중단한다. 부분 변환은 좌표계가 섞여 위험하고,
  // 그 상태로 완료 플래그를 찍으면 이미지를 복구한 뒤에도 재실행이 막혀 해당 stroke가 영구히 letterbox
  // 기준으로 남는다. 여기서 멈추면 DB는 무변경이라 복구 후 안전하게 재적용된다(이중 변환 없음).
  const unresolved = [...aspectBySheet.entries()].filter(([, aspect]) => aspect == null).map(([id]) => id);
  if (unresolved.length > 0) {
    console.error(
      `[migrate-draw] 보류 — 이미지 종횡비를 구하지 못한 시트(파일 누락/메타 실패): ${unresolved.join(", ")}. ` +
        `DB는 변경하지 않았습니다. 이미지 복구 후 재시도하면 적용됩니다.`,
    );
    return { status: "aborted", unresolvedSheets: unresolved };
  }

  let converted = 0;
  const update = sqlite.prepare("UPDATE drawing_paths SET points = ?, width = ? WHERE id = ?");

  // 변환 + 플래그 기록을 한 트랜잭션으로 원자화.
  const runAll = sqlite.transaction(() => {
    for (const row of allPaths) {
      // 위에서 모든 sheetId의 종횡비가 non-null임을 보장했다.
      const aspect = aspectBySheet.get(row.sheetId) as number;
      const points = JSON.parse(row.points) as Point[];
      const result = convertPathToCardBasis(points, row.width, aspect);
      update.run(JSON.stringify(result.points), result.width, row.id);
      converted++;
    }
    sqlite
      .prepare("INSERT OR REPLACE INTO app_meta (key, value) VALUES (?, ?)")
      .run(FLAG_KEY, new Date().toISOString());
  });
  runAll();

  console.log(`[migrate-draw] 완료 — 변환 ${converted}개.`);
  return { status: "done", converted };
}

// CLI 직접 실행 시 (npm run db:migrate:draw). 부팅 자동 경로(index.ts import)에서는 실행되지 않는다.
const isMainModule = !!process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMainModule) {
  runDrawingCoordMigration()
    .then((result) => {
      if (result.status === "already-applied") {
        console.log(`[migrate-draw] 이미 적용됨(${result.appliedAt}) — 건너뜁니다.`);
      }
      sqlite.close();
      if (result.status === "aborted") process.exit(1);
    })
    .catch((err) => {
      console.error("[migrate-draw] 실패:", err);
      process.exit(1);
    });
}
