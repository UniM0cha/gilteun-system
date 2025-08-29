import express from 'express';
import { eq, and, isNull, desc, sql } from 'drizzle-orm';
import { getDatabase } from '../database/connection';
import { annotations, songs } from '../database/schema';
import { createHash } from 'crypto';
import { compress, decompress } from '../utils/compression';

const router = express.Router();

/**
 * 주석 API 라우터 - SVG 패스 기반 벡터 데이터 관리
 *
 * 기능:
 * - SVG 패스 데이터 압축 저장
 * - 사용자별/찬양별 주석 조회
 * - 실시간 협업을 위한 벌크 저장
 * - 소프트 삭제 지원
 * - 성능 최적화된 쿼리
 */

// 유틸리티 함수들

/**
 * SVG 데이터 체크섬 생성
 */
function createChecksum(data: string): string {
  return createHash('md5').update(data).digest('hex');
}

/**
 * SVG 데이터 압축 및 메타데이터 생성
 */
function processSVGData(svgPath: string) {
  const compressed = compress(svgPath);
  const checksum = createChecksum(svgPath);

  return {
    compressedData: compressed,
    originalSize: Buffer.byteLength(svgPath, 'utf8'),
    compressedSize: Buffer.byteLength(compressed, 'utf8'),
    checksum,
  };
}

/**
 * 활성 주석 필터 (삭제되지 않은 주석)
 */
const activeAnnotationsFilter = isNull(annotations.deletedAt);

// API 엔드포인트들

/**
 * GET /api/annotations/song/:songId
 * 특정 찬양의 모든 활성 주석 조회
 */
router.get('/song/:songId', async (req, res) => {
  try {
    const songId = parseInt(req.params.songId);
    if (isNaN(songId)) {
      return res.status(400).json({ error: '유효하지 않은 찬양 ID입니다' });
    }

    const db = getDatabase();
    const result = await db
      .select({
        id: annotations.id,
        songId: annotations.songId,
        userId: annotations.userId,
        userName: annotations.userName,
        layer: annotations.layer,
        svgPath: annotations.svgPath,
        color: annotations.color,
        tool: annotations.tool,
        strokeWidth: annotations.strokeWidth,
        opacity: annotations.opacity,
        isVisible: annotations.isVisible,
        version: annotations.version,
        createdAt: annotations.createdAt,
        updatedAt: annotations.updatedAt,
      })
      .from(annotations)
      .where(and(eq(annotations.songId, songId), activeAnnotationsFilter))
      .orderBy(desc(annotations.createdAt));

    // SVG 데이터 압축 해제
    const processedResult = result.map((annotation) => ({
      ...annotation,
      svgPath: decompress(annotation.svgPath), // 클라이언트로 전송 시 압축 해제
    }));

    res.json({
      data: processedResult,
      message: `찬양 ${songId}의 주석 ${result.length}개 조회 완료`,
    });
  } catch (error) {
    console.error('주석 조회 오류:', error);
    res.status(500).json({ error: '주석 조회 중 오류가 발생했습니다' });
  }
});

/**
 * GET /api/annotations/song/:songId/user/:userId
 * 특정 사용자의 찬양별 주석 조회
 */
router.get('/song/:songId/user/:userId', async (req, res) => {
  try {
    const songId = parseInt(req.params.songId);
    const { userId } = req.params;

    if (isNaN(songId) || !userId) {
      return res.status(400).json({ error: '유효하지 않은 매개변수입니다' });
    }

    const db = getDatabase();
    const result = await db
      .select()
      .from(annotations)
      .where(and(eq(annotations.songId, songId), eq(annotations.userId, userId), activeAnnotationsFilter))
      .orderBy(desc(annotations.createdAt));

    const processedResult = result.map((annotation) => ({
      ...annotation,
      svgPath: decompress(annotation.svgPath),
    }));

    res.json({
      data: processedResult,
      message: `사용자 ${userId}의 주석 ${result.length}개 조회 완료`,
    });
  } catch (error) {
    console.error('사용자 주석 조회 오류:', error);
    res.status(500).json({ error: '사용자 주석 조회 중 오류가 발생했습니다' });
  }
});

/**
 * POST /api/annotations
 * 새 주석 생성
 */
router.post('/', async (req, res) => {
  try {
    const { songId, userId, userName, layer, svgPath, color, tool, strokeWidth = 2, opacity = 1.0 } = req.body;

    // 필수 필드 검증
    if (!songId || !userId || !userName || !svgPath || !color || !tool) {
      return res.status(400).json({ error: '필수 필드가 누락되었습니다' });
    }

    const db = getDatabase();

    // 찬양 존재 여부 확인
    const song = await db.select().from(songs).where(eq(songs.id, songId)).limit(1);
    if (song.length === 0) {
      return res.status(404).json({ error: '찬양을 찾을 수 없습니다' });
    }

    // SVG 데이터 처리 (압축 및 체크섬)
    const { compressedData, compressedSize, checksum } = processSVGData(svgPath);

    // 주석 저장
    const result = await db
      .insert(annotations)
      .values({
        songId,
        userId,
        userName,
        layer: layer || `${userName}의 주석`,
        svgPath: compressedData, // 압축된 데이터 저장
        color,
        tool,
        strokeWidth,
        opacity,
        compressedSize,
        checksum,
      })
      .returning();

    // 클라이언트로 전송할 때는 압축 해제
    const savedAnnotation = {
      ...result[0],
      svgPath: svgPath, // 원본 데이터 반환
    };

    res.status(201).json({
      data: savedAnnotation,
      message: '주석이 성공적으로 저장되었습니다',
    });
  } catch (error) {
    console.error('주석 생성 오류:', error);
    res.status(500).json({ error: '주석 생성 중 오류가 발생했습니다' });
  }
});

/**
 * POST /api/annotations/bulk
 * 여러 주석 한 번에 생성 (실시간 협업용)
 */
router.post('/bulk', async (req, res) => {
  try {
    const { annotations: annotationList } = req.body;

    if (!Array.isArray(annotationList) || annotationList.length === 0) {
      return res.status(400).json({ error: '주석 데이터가 올바르지 않습니다' });
    }

    const db = getDatabase();

    // 모든 주석 처리
    const processedAnnotations = annotationList.map((annotation) => {
      const { compressedData, compressedSize, checksum } = processSVGData(annotation.svgPath);

      return {
        songId: annotation.songId,
        userId: annotation.userId,
        userName: annotation.userName,
        layer: annotation.layer || `${annotation.userName}의 주석`,
        svgPath: compressedData,
        color: annotation.color,
        tool: annotation.tool,
        strokeWidth: annotation.strokeWidth || 2,
        opacity: annotation.opacity || 1.0,
        compressedSize,
        checksum,
      };
    });

    // 벌크 삽입
    const result = await db.insert(annotations).values(processedAnnotations).returning();

    // 응답용 데이터 (압축 해제)
    const responseData = result.map((annotation, index) => ({
      ...annotation,
      svgPath: annotationList[index].svgPath, // 원본 데이터
    }));

    res.status(201).json({
      data: responseData,
      message: `${result.length}개의 주석이 저장되었습니다`,
    });
  } catch (error) {
    console.error('벌크 주석 생성 오류:', error);
    res.status(500).json({ error: '벌크 주석 생성 중 오류가 발생했습니다' });
  }
});

/**
 * PATCH /api/annotations/:id
 * 주석 수정
 */
router.patch('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: '유효하지 않은 주석 ID입니다' });
    }

    const db = getDatabase();
    const updates = req.body;
    const updateData: any = {
      updatedAt: sql`datetime('now')`,
    };

    // SVG 데이터 업데이트 시 재압축
    if (updates.svgPath) {
      const { compressedData, compressedSize, checksum } = processSVGData(updates.svgPath);
      updateData.svgPath = compressedData;
      updateData.compressedSize = compressedSize;
      updateData.checksum = checksum;
      updateData.version = sql`version + 1`; // 버전 증가
    }

    // 다른 필드들
    if (updates.layer !== undefined) updateData.layer = updates.layer;
    if (updates.color !== undefined) updateData.color = updates.color;
    if (updates.tool !== undefined) updateData.tool = updates.tool;
    if (updates.strokeWidth !== undefined) updateData.strokeWidth = updates.strokeWidth;
    if (updates.opacity !== undefined) updateData.opacity = updates.opacity;
    if (updates.isVisible !== undefined) updateData.isVisible = updates.isVisible;

    const result = await db
      .update(annotations)
      .set(updateData)
      .where(and(eq(annotations.id, id), activeAnnotationsFilter))
      .returning();

    if (result.length === 0) {
      return res.status(404).json({ error: '주석을 찾을 수 없습니다' });
    }

    // 응답 데이터 (SVG 압축 해제)
    const responseData = {
      ...result[0],
      svgPath: updates.svgPath || decompress(result[0].svgPath),
    };

    res.json({
      data: responseData,
      message: '주석이 성공적으로 수정되었습니다',
    });
  } catch (error) {
    console.error('주석 수정 오류:', error);
    res.status(500).json({ error: '주석 수정 중 오류가 발생했습니다' });
  }
});

/**
 * DELETE /api/annotations/:id
 * 주석 삭제 (Soft Delete)
 */
router.delete('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: '유효하지 않은 주석 ID입니다' });
    }

    const db = getDatabase();
    const result = await db
      .update(annotations)
      .set({
        deletedAt: sql`datetime('now')`,
        updatedAt: sql`datetime('now')`,
      })
      .where(and(eq(annotations.id, id), activeAnnotationsFilter))
      .returning();

    if (result.length === 0) {
      return res.status(404).json({ error: '주석을 찾을 수 없습니다' });
    }

    res.json({
      message: '주석이 삭제되었습니다',
    });
  } catch (error) {
    console.error('주석 삭제 오류:', error);
    res.status(500).json({ error: '주석 삭제 중 오류가 발생했습니다' });
  }
});

/**
 * DELETE /api/annotations/song/:songId/user/:userId
 * 특정 사용자의 모든 주석 삭제
 */
router.delete('/song/:songId/user/:userId', async (req, res) => {
  try {
    const songId = parseInt(req.params.songId);
    const { userId } = req.params;

    if (isNaN(songId) || !userId) {
      return res.status(400).json({ error: '유효하지 않은 매개변수입니다' });
    }

    const db = getDatabase();
    const result = await db
      .update(annotations)
      .set({
        deletedAt: sql`datetime('now')`,
        updatedAt: sql`datetime('now')`,
      })
      .where(and(eq(annotations.songId, songId), eq(annotations.userId, userId), activeAnnotationsFilter))
      .returning();

    res.json({
      message: `사용자 ${userId}의 주석 ${result.length}개가 삭제되었습니다`,
    });
  } catch (error) {
    console.error('사용자 주석 삭제 오류:', error);
    res.status(500).json({ error: '사용자 주석 삭제 중 오류가 발생했습니다' });
  }
});

/**
 * GET /api/annotations/song/:songId/stats
 * 찬양별 주석 통계
 */
router.get('/song/:songId/stats', async (req, res) => {
  try {
    const songId = parseInt(req.params.songId);
    if (isNaN(songId)) {
      return res.status(400).json({ error: '유효하지 않은 찬양 ID입니다' });
    }

    const db = getDatabase();
    const result = await db
      .select({
        userId: annotations.userId,
        userName: annotations.userName,
        count: sql<number>`count(*)`,
        totalSize: sql<number>`sum(${annotations.compressedSize})`,
        latestUpdate: sql<string>`max(${annotations.updatedAt})`,
      })
      .from(annotations)
      .where(and(eq(annotations.songId, songId), activeAnnotationsFilter))
      .groupBy(annotations.userId, annotations.userName)
      .orderBy(desc(sql`count(*)`));

    res.json({
      data: result,
      message: `찬양 ${songId}의 주석 통계 조회 완료`,
    });
  } catch (error) {
    console.error('주석 통계 조회 오류:', error);
    res.status(500).json({ error: '주석 통계 조회 중 오류가 발생했습니다' });
  }
});

/**
 * GET /api/annotations/song/:songId/export
 * 주석을 하나의 SVG로 병합하여 내보내기
 */
router.get('/song/:songId/export', async (req, res) => {
  try {
    const songId = parseInt(req.params.songId);
    const userIds = req.query.userIds as string;

    if (isNaN(songId)) {
      return res.status(400).json({ error: '유효하지 않은 찬양 ID입니다' });
    }

    const db = getDatabase();

    // WHERE 조건 구성
    const whereConditions = [eq(annotations.songId, songId), activeAnnotationsFilter];

    // 특정 사용자들만 포함
    if (userIds) {
      const userIdList = userIds.split(',').filter((id) => id.trim());
      if (userIdList.length > 0) {
        whereConditions.push(sql`${annotations.userId} IN (${userIdList.map((id) => `'${id}'`).join(',')})`);
      }
    }

    const result = await db
      .select({
        svgPath: annotations.svgPath,
        color: annotations.color,
        userName: annotations.userName,
        opacity: annotations.opacity,
      })
      .from(annotations)
      .where(and(...whereConditions))
      .orderBy(desc(annotations.createdAt));

    // SVG 병합
    let combinedSVG = `<svg viewBox="0 0 800 600" xmlns="http://www.w3.org/2000/svg">`;

    result.forEach((annotation) => {
      const decompressed = decompress(annotation.svgPath);
      // 각 주석을 그룹으로 감싸서 사용자별로 식별 가능하게 함
      combinedSVG += `
        <g data-user="${annotation.userName}" opacity="${annotation.opacity || 1.0}">
          ${decompressed}
        </g>
      `;
    });

    combinedSVG += `</svg>`;

    res.json({
      data: { svg: combinedSVG },
      message: `${result.length}개의 주석이 병합되었습니다`,
    });
  } catch (error) {
    console.error('주석 내보내기 오류:', error);
    res.status(500).json({ error: '주석 내보내기 중 오류가 발생했습니다' });
  }
});

export default router;
