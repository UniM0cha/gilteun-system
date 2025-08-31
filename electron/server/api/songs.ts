import { Router } from 'express';
import { sql } from 'kysely';
import { getDatabase } from '../database/connection';
import type { NewSong } from '../database/schema';
import { logger } from '../utils/logger';

const router = Router();

/**
 * 찬양 관리 API
 * Kysely를 사용한 SQLite 데이터베이스 연동
 */

// 찬양 목록 조회
router.get('/', async (req, res) => {
  try {
    const { worshipId, limit = 10, offset = 0 } = req.query;
    logger.info('찬양 목록 조회 요청', { worshipId, limit, offset });

    const db = getDatabase();

    // 기본 쿼리 빌더
    let query = db
      .selectFrom('songs')
      .selectAll()
      .orderBy('order', 'asc')
      .orderBy('created_at', 'desc')
      .limit(Number(limit))
      .offset(Number(offset));

    // 예배 ID 필터링
    if (worshipId) {
      const worshipIdNum = Number(worshipId);
      if (isNaN(worshipIdNum)) {
        return res.status(400).json({
          error: 'Bad Request',
          message: '유효하지 않은 예배 ID입니다',
        });
      }
      query = query.where('worship_id', '=', worshipIdNum);
    }

    // 쿼리 실행
    const songsList = await query.execute();

    // 전체 개수 조회 (페이징용)
    let countQuery = db
      .selectFrom('songs')
      .select(sql`count(*) as count`.as('count'));
    
    if (worshipId) {
      countQuery = countQuery.where('worship_id', '=', Number(worshipId));
    }

    const totalResult = await countQuery.executeTakeFirst();
    const total = Number(totalResult?.count || 0);

    res.json({
      songs: songsList,
      pagination: {
        total,
        limit: Number(limit),
        offset: Number(offset),
        hasMore: Number(offset) + Number(limit) < total,
      },
    });

    logger.info(`찬양 목록 ${songsList.length}개 반환`);
  } catch (error) {
    logger.error('찬양 목록 조회 실패', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: '찬양 목록 조회 중 오류가 발생했습니다',
    });
  }
});

// 찬양 상세 조회
router.get('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({
        error: 'Bad Request',
        message: '유효하지 않은 찬양 ID입니다',
      });
    }

    const db = getDatabase();

    // 찬양 정보 조회 (예배 정보 포함)
    const song = await db
      .selectFrom('songs')
      .leftJoin('worships', 'songs.worship_id', 'worships.id')
      .select([
        'songs.id',
        'songs.worship_id as worshipId',
        'songs.title',
        'songs.key',
        'songs.memo',
        'songs.image_path as imagePath',
        'songs.order',
        'songs.created_at as createdAt',
        'worships.title as worshipTitle',
        'worships.date as worshipDate',
      ])
      .where('songs.id', '=', id)
      .executeTakeFirst();

    if (!song) {
      return res.status(404).json({
        error: 'Not Found',
        message: `ID ${id}인 찬양을 찾을 수 없습니다`,
      });
    }

    logger.info(`찬양 조회: ${song.title} (ID: ${id})`);
    res.json(song);
  } catch (error) {
    logger.error('찬양 조회 실패', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: '찬양 조회 중 오류가 발생했습니다',
    });
  }
});

// 찬양 생성
router.post('/', async (req, res) => {
  try {
    const { worshipId, title, key, memo, order } = req.body;

    // 유효성 검사
    if (!worshipId || !title) {
      return res.status(400).json({
        error: 'Bad Request',
        message: '예배 ID(worshipId)와 제목(title)은 필수 항목입니다',
        required: ['worshipId', 'title'],
        optional: ['key', 'memo', 'order'],
      });
    }

    const worshipIdNum = Number(worshipId);
    if (isNaN(worshipIdNum)) {
      return res.status(400).json({
        error: 'Bad Request',
        message: '유효하지 않은 예배 ID입니다',
      });
    }

    const db = getDatabase();

    // 예배 존재 여부 확인
    const existingWorship = await db
      .selectFrom('worships')
      .select('id')
      .where('id', '=', worshipIdNum)
      .executeTakeFirst();

    if (!existingWorship) {
      return res.status(404).json({
        error: 'Not Found',
        message: `ID ${worshipIdNum}인 예배를 찾을 수 없습니다`,
      });
    }

    // 순서 결정 (제공되지 않은 경우 마지막으로)
    let finalOrder = order;
    if (!finalOrder) {
      const maxOrderResult = await db
        .selectFrom('songs')
        .select(sql`max("order") as max_order`.as('maxOrder'))
        .where('worship_id', '=', worshipIdNum)
        .executeTakeFirst();

      finalOrder = (Number(maxOrderResult?.maxOrder) || 0) + 1;
    }

    // 새 찬양 생성
    const newSongData: NewSong = {
      worship_id: worshipIdNum,
      title,
      key: key || null,
      memo: memo || null,
      image_path: null, // Phase 3에서 파일 업로드 구현
      order: finalOrder,
    };

    const result = await db
      .insertInto('songs')
      .values(newSongData)
      .returning(['id', 'worship_id', 'title', 'key', 'memo', 'image_path', 'order', 'created_at'])
      .executeTakeFirst();

    if (!result) {
      throw new Error('찬양 생성 실패');
    }

    logger.info(`새 찬양 생성: ${result.title} (ID: ${result.id})`);
    res.status(201).json(result);
  } catch (error) {
    logger.error('찬양 생성 실패', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: '찬양 생성 중 오류가 발생했습니다',
    });
  }
});

// 찬양 정보 수정
router.put('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({
        error: 'Bad Request',
        message: '유효하지 않은 찬양 ID입니다',
      });
    }

    const { title, key, memo, order } = req.body;
    const db = getDatabase();

    // 찬양 존재 여부 확인
    const existingSong = await db
      .selectFrom('songs')
      .selectAll()
      .where('id', '=', id)
      .executeTakeFirst();

    if (!existingSong) {
      return res.status(404).json({
        error: 'Not Found',
        message: `ID ${id}인 찬양을 찾을 수 없습니다`,
      });
    }

    // 업데이트할 데이터 준비
    const updateData: Partial<NewSong> = {};
    if (title !== undefined) updateData.title = title;
    if (key !== undefined) updateData.key = key;
    if (memo !== undefined) updateData.memo = memo;
    if (order !== undefined) updateData.order = order;

    // 업데이트 실행
    const result = await db
      .updateTable('songs')
      .set(updateData)
      .where('id', '=', id)
      .returning(['id', 'worship_id', 'title', 'key', 'memo', 'image_path', 'order', 'created_at'])
      .executeTakeFirst();

    logger.info(`찬양 정보 수정: ${result?.title} (ID: ${id})`);
    res.json(result);
  } catch (error) {
    logger.error('찬양 정보 수정 실패', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: '찬양 정보를 수정하는 중 오류가 발생했습니다',
    });
  }
});

// 찬양 삭제
router.delete('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({
        error: 'Bad Request',
        message: '유효하지 않은 찬양 ID입니다',
      });
    }

    const db = getDatabase();

    // 찬양 존재 여부 확인
    const existingSong = await db
      .selectFrom('songs')
      .selectAll()
      .where('id', '=', id)
      .executeTakeFirst();

    if (!existingSong) {
      return res.status(404).json({
        error: 'Not Found',
        message: `ID ${id}인 찬양을 찾을 수 없습니다`,
      });
    }

    // 관련 주석도 함께 삭제
    await db
      .deleteFrom('annotations')
      .where('song_id', '=', id)
      .execute();

    // 찬양 삭제
    await db
      .deleteFrom('songs')
      .where('id', '=', id)
      .execute();

    logger.info(`찬양 삭제: ${existingSong.title} (ID: ${id})`);
    res.json({
      message: '찬양이 성공적으로 삭제되었습니다',
      deletedSong: existingSong,
    });
  } catch (error) {
    logger.error('찬양 삭제 실패', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: '찬양을 삭제하는 중 오류가 발생했습니다',
    });
  }
});

export default router;