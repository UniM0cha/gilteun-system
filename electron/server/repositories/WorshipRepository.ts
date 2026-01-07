// 예배 Repository

import { Kysely } from 'kysely';
import { BaseRepository, generateId, now } from './BaseRepository.js';
import type { Database, WorshipTable } from '../database/types.js';

// 예배 생성 입력
export interface CreateWorshipInput {
  title: string;
  date: string;
  time?: string | null;
  memo?: string | null;
}

// 예배 수정 입력
export interface UpdateWorshipInput {
  title?: string;
  date?: string;
  time?: string | null;
  memo?: string | null;
}

export class WorshipRepository extends BaseRepository<'worships'> {
  constructor(db: Kysely<Database>) {
    super(db, 'worships');
  }

  // 예배 생성
  async create(input: CreateWorshipInput): Promise<WorshipTable> {
    const id = generateId();
    const timestamp = now();

    const worship: WorshipTable = {
      id,
      title: input.title,
      date: input.date,
      time: input.time ?? null,
      memo: input.memo ?? null,
      created_at: timestamp,
      updated_at: timestamp,
      deleted_at: null,
    };

    await this.db.insertInto('worships').values(worship).execute();

    return worship;
  }

  // 예배 수정
  async update(id: string, input: UpdateWorshipInput): Promise<WorshipTable | null> {
    const existing = await this.findById(id);
    if (!existing) return null;

    const updated = {
      ...input,
      updated_at: now(),
    };

    await this.db
      .updateTable('worships')
      .set(updated)
      .where('id', '=', id)
      .execute();

    return await this.findById(id) ?? null;
  }

  // 날짜 범위로 예배 조회
  async findByDateRange(startDate: string, endDate: string): Promise<WorshipTable[]> {
    return await this.db
      .selectFrom('worships')
      .selectAll()
      .where('date', '>=', startDate)
      .where('date', '<=', endDate)
      .where('deleted_at', 'is', null)
      .orderBy('date', 'desc')
      .execute();
  }

  // 최근 예배 조회
  async findRecent(limit: number = 10): Promise<WorshipTable[]> {
    return await this.db
      .selectFrom('worships')
      .selectAll()
      .where('deleted_at', 'is', null)
      .orderBy('date', 'desc')
      .limit(limit)
      .execute();
  }
}
