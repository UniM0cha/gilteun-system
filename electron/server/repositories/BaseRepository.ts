// 기본 Repository 클래스

import { Kysely } from 'kysely';
import type { Database } from '../database/types.js';

// UUID 생성
export function generateId(): string {
  return crypto.randomUUID();
}

// 현재 시간 (ISO 문자열)
export function now(): string {
  return new Date().toISOString();
}

// 기본 Repository 추상 클래스
export abstract class BaseRepository<T extends keyof Database> {
  protected tableName: T;
  protected db: Kysely<Database>;

  constructor(db: Kysely<Database>, tableName: T) {
    this.db = db;
    this.tableName = tableName;
  }

  // 전체 조회 (삭제된 항목 제외)
  async findAll(): Promise<Database[T][]> {
    return await this.db
      .selectFrom(this.tableName)
      .selectAll()
      .where('deleted_at' as keyof Database[T], 'is', null)
      .execute() as Database[T][];
  }

  // ID로 조회
  async findById(id: string): Promise<Database[T] | undefined> {
    const result = await this.db
      .selectFrom(this.tableName)
      .selectAll()
      .where('id' as keyof Database[T], '=', id as Database[T][keyof Database[T]])
      .where('deleted_at' as keyof Database[T], 'is', null)
      .executeTakeFirst();
    return result as Database[T] | undefined;
  }

  // 소프트 삭제
  async softDelete(id: string): Promise<boolean> {
    const result = await this.db
      .updateTable(this.tableName)
      .set({ deleted_at: now() } as Partial<Database[T]>)
      .where('id' as keyof Database[T], '=', id as Database[T][keyof Database[T]])
      .execute();
    return result[0].numUpdatedRows > 0n;
  }

  // 하드 삭제 (실제 삭제)
  async hardDelete(id: string): Promise<boolean> {
    const result = await this.db
      .deleteFrom(this.tableName)
      .where('id' as keyof Database[T], '=', id as Database[T][keyof Database[T]])
      .execute();
    return result[0].numDeletedRows > 0n;
  }
}
