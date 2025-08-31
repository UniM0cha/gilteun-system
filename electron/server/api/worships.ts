import { Router } from 'express';
import { sql } from 'kysely';
import { getDatabase } from '../database/connection';
import type { NewWorship } from '../database/schema';
import { logger } from '../utils/logger';

const router = Router();

/**
 * 예배 관리 API
 * Kysely를 사용한 SQLite 데이터베이스 연동
 */

// 모든 예배 조회
router.get('/', async (req, res) => {
  try {
    logger.info('예배 목록 조회 요청');
    const db = getDatabase();

    // 쿼리 파라미터 처리
    const { limit = 10, offset = 0, date, startDate, endDate } = req.query;

    // 기본 쿼리 빌더
    let query = db
      .selectFrom('worships')
      .selectAll()
      .orderBy('date', 'desc')
      .orderBy('created_at', 'desc')
      .limit(Number(limit))
      .offset(Number(offset));

    // 날짜 필터링 조건 추가
    if (date) {
      query = query.where('date', '=', String(date));
    }
    if (startDate && endDate) {
      query = query
        .where('date', '>=', String(startDate))
        .where('date', '<=', String(endDate));
    }

    // 쿼리 실행
    const worshipsList = await query.execute();

    // 각 예배의 찬양 개수 조회
    const worshipsWithSongsCount = await Promise.all(
      worshipsList.map(async (worship) => {
        const result = await db
          .selectFrom('songs')
          .select(sql`count(*) as count`.as('count'))
          .where('worship_id', '=', worship.id)
          .executeTakeFirst();

        return {
          ...worship,
          songsCount: Number(result?.count || 0),
        };
      }),
    );

    // 전체 개수 조회 (페이징용)
    let totalQuery = db
      .selectFrom('worships')
      .select(sql`count(*) as count`.as('count'));
    
    if (date) {
      totalQuery = totalQuery.where('date', '=', String(date));
    }
    if (startDate && endDate) {
      totalQuery = totalQuery
        .where('date', '>=', String(startDate))
        .where('date', '<=', String(endDate));
    }
    
    const totalResult = await totalQuery.executeTakeFirst();
    const total = Number(totalResult?.count || 0);

    res.json({
      worships: worshipsWithSongsCount,
      pagination: {
        total,
        limit: Number(limit),
        offset: Number(offset),
        hasMore: Number(offset) + Number(limit) < total,
      },
    });

    logger.info(`예배 목록 ${worshipsWithSongsCount.length}개 반환`);
  } catch (error) {
    logger.error('예배 목록 조회 실패', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: '예배 목록을 조회하는 중 오류가 발생했습니다',
    });
  }
});

// 특정 예배 조회
router.get('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({
        error: 'Bad Request',
        message: '유효하지 않은 예배 ID입니다',
      });
    }

    const db = getDatabase();
    
    // 예배 정보 조회
    const worship = await db
      .selectFrom('worships')
      .selectAll()
      .where('id', '=', id)
      .executeTakeFirst();

    if (!worship) {
      return res.status(404).json({
        error: 'Not Found',
        message: `예배 ID ${id}를 찾을 수 없습니다`,
      });
    }

    // 예배에 속한 찬양 목록 조회
    const songsList = await db
      .selectFrom('songs')
      .selectAll()
      .where('worship_id', '=', id)
      .orderBy('order', 'asc')
      .execute();

    res.json({
      ...worship,
      songs: songsList,
    });

    logger.info(`예배 상세 조회: ${worship.title}`);
  } catch (error) {
    logger.error('예배 상세 조회 실패', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: '예배 정보를 조회하는 중 오류가 발생했습니다',
    });
  }
});

// 예배 생성
router.post('/', async (req, res) => {
  try {
    const worshipData: NewWorship = req.body;

    // 필수 필드 검증
    if (!worshipData.title || !worshipData.date) {
      return res.status(400).json({
        error: 'Bad Request',
        message: '예배 제목과 날짜는 필수입니다',
      });
    }

    const db = getDatabase();

    // 예배 생성
    const result = await db
      .insertInto('worships')
      .values({
        title: worshipData.title,
        date: worshipData.date,
        time: worshipData.time || null,
        description: worshipData.description || null,
      })
      .returning(['id', 'title', 'date', 'time', 'description', 'created_at'])
      .executeTakeFirst();

    if (!result) {
      throw new Error('예배 생성 실패');
    }

    res.status(201).json(result);
    logger.info(`새 예배 생성: ${result.title}`);
  } catch (error) {
    logger.error('예배 생성 실패', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: '예배를 생성하는 중 오류가 발생했습니다',
    });
  }
});

// 예배 수정
router.put('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({
        error: 'Bad Request',
        message: '유효하지 않은 예배 ID입니다',
      });
    }

    const worshipData: Partial<NewWorship> = req.body;
    const db = getDatabase();

    // 기존 예배 확인
    const existing = await db
      .selectFrom('worships')
      .select('id')
      .where('id', '=', id)
      .executeTakeFirst();

    if (!existing) {
      return res.status(404).json({
        error: 'Not Found',
        message: `예배 ID ${id}를 찾을 수 없습니다`,
      });
    }

    // 예배 정보 업데이트
    const updateData: Partial<NewWorship> = {};
    if (worshipData.title !== undefined) updateData.title = worshipData.title;
    if (worshipData.date !== undefined) updateData.date = worshipData.date;
    if (worshipData.time !== undefined) updateData.time = worshipData.time;
    if (worshipData.description !== undefined) updateData.description = worshipData.description;

    const result = await db
      .updateTable('worships')
      .set(updateData)
      .where('id', '=', id)
      .returning(['id', 'title', 'date', 'time', 'description', 'created_at'])
      .executeTakeFirst();

    res.json(result);
    logger.info(`예배 수정: ID ${id}`);
  } catch (error) {
    logger.error('예배 수정 실패', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: '예배를 수정하는 중 오류가 발생했습니다',
    });
  }
});

// 예배 삭제
router.delete('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({
        error: 'Bad Request',
        message: '유효하지 않은 예배 ID입니다',
      });
    }

    const db = getDatabase();

    // 예배에 속한 찬양들의 주석 먼저 삭제
    const songsToDelete = await db
      .selectFrom('songs')
      .select('id')
      .where('worship_id', '=', id)
      .execute();

    for (const song of songsToDelete) {
      await db
        .deleteFrom('annotations')
        .where('song_id', '=', song.id)
        .execute();
    }

    // 예배에 속한 찬양 삭제
    await db
      .deleteFrom('songs')
      .where('worship_id', '=', id)
      .execute();

    // 예배 삭제
    const result = await db
      .deleteFrom('worships')
      .where('id', '=', id)
      .executeTakeFirst();

    if (result.numDeletedRows === BigInt(0)) {
      return res.status(404).json({
        error: 'Not Found',
        message: `예배 ID ${id}를 찾을 수 없습니다`,
      });
    }

    res.status(204).send();
    logger.info(`예배 삭제: ID ${id}`);
  } catch (error) {
    logger.error('예배 삭제 실패', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: '예배를 삭제하는 중 오류가 발생했습니다',
    });
  }
});

export default router;