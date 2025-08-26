import { Router } from 'express';
import { and, desc, eq, gte, lte } from 'drizzle-orm';
import { getDatabase } from '../database/connection';
import type { NewWorship } from '../database/schema';
import { songs, worships } from '../database/schema';
import { logger } from '../utils/logger';

const router = Router();

/**
 * 예배 관리 API
 * Drizzle ORM을 사용한 SQLite 데이터베이스 연동
 */

// 모든 예배 조회
router.get('/', async (req, res) => {
  try {
    logger.info('예배 목록 조회 요청');
    const db = getDatabase();

    // 쿼리 파라미터 처리
    const { limit = 10, offset = 0, date, startDate, endDate } = req.query;

    // 기본 쿼리 빌더
    let query = db.select({
      id: worships.id,
      title: worships.title,
      date: worships.date,
      time: worships.time,
      description: worships.description,
      createdAt: worships.createdAt,
    }).from(worships);

    // 날짜 필터링
    const conditions = [];
    if (date) {
      conditions.push(eq(worships.date, String(date)));
    }
    if (startDate && endDate) {
      conditions.push(
        and(
          gte(worships.date, String(startDate)),
          lte(worships.date, String(endDate)),
        ),
      );
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    // 정렬 및 페이징
    const worshipsList = await query
      .orderBy(desc(worships.date), desc(worships.createdAt))
      .limit(Number(limit))
      .offset(Number(offset));

    // 각 예배의 찬양 개수 조회
    const worshipsWithSongsCount = await Promise.all(
      worshipsList.map(async (worship) => {
        const songsCount = await db.select({ count: songs.id })
          .from(songs)
          .where(eq(songs.worshipId, worship.id));

        return {
          ...worship,
          songsCount: songsCount.length,
        };
      }),
    );

    // 전체 개수 조회 (페이징용)
    const totalQuery = db.select({ count: worships.id }).from(worships);
    if (conditions.length > 0) {
      totalQuery.where(and(...conditions));
    }
    const totalResult = await totalQuery;
    const total = totalResult.length;

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
    const worship = await db.select()
      .from(worships)
      .where(eq(worships.id, id))
      .get();

    if (!worship) {
      return res.status(404).json({
        error: 'Not Found',
        message: `ID ${id}인 예배를 찾을 수 없습니다`,
      });
    }

    // 해당 예배의 찬양 개수 조회
    const songsCount = await db.select({ count: songs.id })
      .from(songs)
      .where(eq(songs.worshipId, id));

    const worshipWithSongsCount = {
      ...worship,
      songsCount: songsCount.length,
    };

    logger.info(`예배 조회: ${worship.title}`);
    res.json(worshipWithSongsCount);
  } catch (error) {
    logger.error('예배 조회 실패', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: '예배 정보를 조회하는 중 오류가 발생했습니다',
    });
  }
});

// 새 예배 생성
router.post('/', async (req, res) => {
  try {
    const { title, date, time, description } = req.body;

    // 유효성 검사
    if (!title || !date) {
      return res.status(400).json({
        error: 'Bad Request',
        message: '제목(title)과 날짜(date)는 필수 항목입니다',
        required: ['title', 'date'],
        optional: ['time', 'description'],
      });
    }

    // 날짜 형식 검증 (YYYY-MM-DD)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(date)) {
      return res.status(400).json({
        error: 'Bad Request',
        message: '날짜는 YYYY-MM-DD 형식이어야 합니다',
        example: '2024-03-15',
      });
    }

    const db = getDatabase();

    // 새 예배 생성
    const newWorshipData: NewWorship = {
      title,
      date,
      time: time || null,
      description: description || null,
    };

    const result = await db.insert(worships).values(newWorshipData).returning();
    const newWorship = result[0];

    const worshipWithSongsCount = {
      ...newWorship,
      songsCount: 0,
    };

    logger.info(`새 예배 생성: ${newWorship.title} (ID: ${newWorship.id})`);
    res.status(201).json(worshipWithSongsCount);
  } catch (error) {
    logger.error('예배 생성 실패', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: '예배를 생성하는 중 오류가 발생했습니다',
    });
  }
});

// 예배 정보 수정
router.put('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({
        error: 'Bad Request',
        message: '유효하지 않은 예배 ID입니다',
      });
    }

    const { title, date, time, description } = req.body;

    // 날짜 형식 검증 (제공된 경우)
    if (date) {
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(date)) {
        return res.status(400).json({
          error: 'Bad Request',
          message: '날짜는 YYYY-MM-DD 형식이어야 합니다',
          example: '2024-03-15',
        });
      }
    }

    const db = getDatabase();

    // 예배 존재 여부 확인
    const existingWorship = await db.select()
      .from(worships)
      .where(eq(worships.id, id))
      .get();

    if (!existingWorship) {
      return res.status(404).json({
        error: 'Not Found',
        message: `ID ${id}인 예배를 찾을 수 없습니다`,
      });
    }

    // 업데이트할 데이터 준비
    const updateData: Partial<NewWorship> = {};
    if (title !== undefined) updateData.title = title;
    if (date !== undefined) updateData.date = date;
    if (time !== undefined) updateData.time = time;
    if (description !== undefined) updateData.description = description;

    // 업데이트 실행
    const result = await db.update(worships)
      .set(updateData)
      .where(eq(worships.id, id))
      .returning();

    const updatedWorship = result[0];

    // 찬양 개수 추가
    const songsCount = await db.select({ count: songs.id })
      .from(songs)
      .where(eq(songs.worshipId, id));

    const worshipWithSongsCount = {
      ...updatedWorship,
      songsCount: songsCount.length,
    };

    logger.info(`예배 정보 수정: ${updatedWorship.title} (ID: ${id})`);
    res.json(worshipWithSongsCount);
  } catch (error) {
    logger.error('예배 정보 수정 실패', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: '예배 정보를 수정하는 중 오류가 발생했습니다',
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

    // 예배 존재 여부 확인
    const existingWorship = await db.select()
      .from(worships)
      .where(eq(worships.id, id))
      .get();

    if (!existingWorship) {
      return res.status(404).json({
        error: 'Not Found',
        message: `ID ${id}인 예배를 찾을 수 없습니다`,
      });
    }

    // 관련 찬양과 주석도 함께 삭제 (CASCADE)
    // Phase 2에서 구현: 주석 데이터 정리

    // 해당 예배의 찬양들 삭제
    await db.delete(songs).where(eq(songs.worshipId, id));

    // 예배 삭제
    await db.delete(worships).where(eq(worships.id, id));

    logger.info(`예배 삭제: ${existingWorship.title} (ID: ${id})`);
    res.json({
      message: '예배가 성공적으로 삭제되었습니다',
      deletedWorship: existingWorship,
    });
  } catch (error) {
    logger.error('예배 삭제 실패', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: '예배를 삭제하는 중 오류가 발생했습니다',
    });
  }
});

export default router;
