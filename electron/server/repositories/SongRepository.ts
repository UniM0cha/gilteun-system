// 찬양 Repository

import { Kysely } from 'kysely';
import { BaseRepository, generateId, now } from './BaseRepository.js';
import type { Database, SongTable } from '../database/types.js';

// 찬양 생성 입력
export interface CreateSongInput {
  worshipId: string;
  title: string;
  key?: string | null;
  memo?: string | null;
  imagePath?: string | null;
  orderIndex: number;
}

// 찬양 수정 입력
export interface UpdateSongInput {
  title?: string;
  key?: string | null;
  memo?: string | null;
  imagePath?: string | null;
  orderIndex?: number;
}

export class SongRepository extends BaseRepository<'songs'> {
  constructor(db: Kysely<Database>) {
    super(db, 'songs');
  }

  // 찬양 생성
  async create(input: CreateSongInput): Promise<SongTable> {
    const id = generateId();
    const timestamp = now();

    const song: SongTable = {
      id,
      worship_id: input.worshipId,
      title: input.title,
      key: input.key ?? null,
      memo: input.memo ?? null,
      image_path: input.imagePath ?? null,
      order_index: input.orderIndex,
      created_at: timestamp,
      updated_at: timestamp,
      deleted_at: null,
    };

    await this.db.insertInto('songs').values(song).execute();

    return song;
  }

  // 찬양 수정
  async update(id: string, input: UpdateSongInput): Promise<SongTable | null> {
    const existing = await this.findById(id);
    if (!existing) return null;

    const updated: Record<string, unknown> = {
      updated_at: now(),
    };

    if (input.title !== undefined) updated.title = input.title;
    if (input.key !== undefined) updated.key = input.key;
    if (input.memo !== undefined) updated.memo = input.memo;
    if (input.imagePath !== undefined) updated.image_path = input.imagePath;
    if (input.orderIndex !== undefined) updated.order_index = input.orderIndex;

    await this.db
      .updateTable('songs')
      .set(updated)
      .where('id', '=', id)
      .execute();

    return await this.findById(id) ?? null;
  }

  // 예배별 찬양 조회 (순서대로)
  async findByWorshipId(worshipId: string): Promise<SongTable[]> {
    return await this.db
      .selectFrom('songs')
      .selectAll()
      .where('worship_id', '=', worshipId)
      .where('deleted_at', 'is', null)
      .orderBy('order_index', 'asc')
      .execute();
  }

  // 찬양 순서 변경 (벌크)
  async updateOrders(orders: { id: string; orderIndex: number }[]): Promise<void> {
    for (const order of orders) {
      await this.db
        .updateTable('songs')
        .set({ order_index: order.orderIndex, updated_at: now() })
        .where('id', '=', order.id)
        .execute();
    }
  }

  // 예배의 다음 순서 번호 가져오기
  async getNextOrderIndex(worshipId: string): Promise<number> {
    const result = await this.db
      .selectFrom('songs')
      .select((eb) => eb.fn.max('order_index').as('max_order'))
      .where('worship_id', '=', worshipId)
      .where('deleted_at', 'is', null)
      .executeTakeFirst();

    return ((result?.max_order as number) ?? -1) + 1;
  }
}
