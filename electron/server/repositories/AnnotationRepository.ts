// 주석 Repository

import { Kysely } from 'kysely';
import { BaseRepository, generateId, now } from './BaseRepository.js';
import type { Database, AnnotationTable, AnnotationTool } from '../database/types.js';

// 주석 생성 입력
export interface CreateAnnotationInput {
  songId: string;
  profileId: string;
  svgPath: string;
  color: string;
  tool: AnnotationTool;
  strokeWidth?: number | null;
  metadata?: Record<string, unknown> | null;
}

// 주석 수정 입력
export interface UpdateAnnotationInput {
  svgPath?: string;
  color?: string;
  tool?: AnnotationTool;
  strokeWidth?: number | null;
  metadata?: Record<string, unknown> | null;
}

export class AnnotationRepository extends BaseRepository<'annotations'> {
  constructor(db: Kysely<Database>) {
    super(db, 'annotations');
  }

  // 주석 생성
  async create(input: CreateAnnotationInput): Promise<AnnotationTable> {
    const id = generateId();
    const timestamp = now();

    const annotation: AnnotationTable = {
      id,
      song_id: input.songId,
      profile_id: input.profileId,
      svg_path: input.svgPath,
      color: input.color,
      tool: input.tool,
      stroke_width: input.strokeWidth ?? null,
      metadata: input.metadata ? JSON.stringify(input.metadata) : null,
      created_at: timestamp,
      updated_at: timestamp,
      deleted_at: null,
    };

    await this.db.insertInto('annotations').values(annotation).execute();

    return annotation;
  }

  // 주석 수정
  async update(id: string, input: UpdateAnnotationInput): Promise<AnnotationTable | null> {
    const existing = await this.findById(id);
    if (!existing) return null;

    const updated: Record<string, unknown> = {
      updated_at: now(),
    };

    if (input.svgPath !== undefined) updated.svg_path = input.svgPath;
    if (input.color !== undefined) updated.color = input.color;
    if (input.tool !== undefined) updated.tool = input.tool;
    if (input.strokeWidth !== undefined) updated.stroke_width = input.strokeWidth;
    if (input.metadata !== undefined) {
      updated.metadata = input.metadata ? JSON.stringify(input.metadata) : null;
    }

    await this.db
      .updateTable('annotations')
      .set(updated)
      .where('id', '=', id)
      .execute();

    return await this.findById(id) ?? null;
  }

  // 찬양별 주석 조회
  async findBySongId(songId: string): Promise<AnnotationTable[]> {
    return await this.db
      .selectFrom('annotations')
      .selectAll()
      .where('song_id', '=', songId)
      .where('deleted_at', 'is', null)
      .orderBy('created_at', 'asc')
      .execute();
  }

  // 찬양 + 프로필별 주석 조회
  async findBySongAndProfile(songId: string, profileId: string): Promise<AnnotationTable[]> {
    return await this.db
      .selectFrom('annotations')
      .selectAll()
      .where('song_id', '=', songId)
      .where('profile_id', '=', profileId)
      .where('deleted_at', 'is', null)
      .orderBy('created_at', 'asc')
      .execute();
  }

  // 프로필의 모든 주석 삭제 (특정 찬양)
  async deleteByProfileAndSong(profileId: string, songId: string): Promise<number> {
    const result = await this.db
      .updateTable('annotations')
      .set({ deleted_at: now() })
      .where('profile_id', '=', profileId)
      .where('song_id', '=', songId)
      .where('deleted_at', 'is', null)
      .execute();

    return Number(result[0].numUpdatedRows);
  }

  // 벌크 생성 (여러 주석 한번에)
  async createBulk(inputs: CreateAnnotationInput[]): Promise<AnnotationTable[]> {
    const annotations: AnnotationTable[] = inputs.map((input) => {
      const id = generateId();
      const timestamp = now();

      return {
        id,
        song_id: input.songId,
        profile_id: input.profileId,
        svg_path: input.svgPath,
        color: input.color,
        tool: input.tool,
        stroke_width: input.strokeWidth ?? null,
        metadata: input.metadata ? JSON.stringify(input.metadata) : null,
        created_at: timestamp,
        updated_at: timestamp,
        deleted_at: null,
      };
    });

    if (annotations.length > 0) {
      await this.db.insertInto('annotations').values(annotations).execute();
    }

    return annotations;
  }
}
