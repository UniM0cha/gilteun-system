// 프로필 Repository

import { Kysely } from 'kysely';
import { BaseRepository, generateId, now } from './BaseRepository.js';
import type { Database, ProfileTable, ProfileRole } from '../database/types.js';

// 프로필 생성 입력
export interface CreateProfileInput {
  name: string;
  role: ProfileRole;
  icon: string;
  color: string;
}

// 프로필 수정 입력
export interface UpdateProfileInput {
  name?: string;
  role?: ProfileRole;
  icon?: string;
  color?: string;
}

export class ProfileRepository extends BaseRepository<'profiles'> {
  constructor(db: Kysely<Database>) {
    super(db, 'profiles');
  }

  // 프로필 생성
  async create(input: CreateProfileInput): Promise<ProfileTable> {
    const id = generateId();
    const timestamp = now();

    const profile: ProfileTable = {
      id,
      name: input.name,
      role: input.role,
      icon: input.icon,
      color: input.color,
      created_at: timestamp,
      updated_at: timestamp,
      deleted_at: null,
    };

    await this.db.insertInto('profiles').values(profile).execute();

    return profile;
  }

  // 프로필 수정
  async update(id: string, input: UpdateProfileInput): Promise<ProfileTable | null> {
    const existing = await this.findById(id);
    if (!existing) return null;

    const updated = {
      ...input,
      updated_at: now(),
    };

    await this.db
      .updateTable('profiles')
      .set(updated)
      .where('id', '=', id)
      .execute();

    return await this.findById(id) ?? null;
  }

  // 역할별 프로필 조회
  async findByRole(role: ProfileRole): Promise<ProfileTable[]> {
    return await this.db
      .selectFrom('profiles')
      .selectAll()
      .where('role', '=', role)
      .where('deleted_at', 'is', null)
      .execute();
  }
}
