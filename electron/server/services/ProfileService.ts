// 프로필 서비스

import { ProfileRepository, CreateProfileInput, UpdateProfileInput } from '../repositories/ProfileRepository.js';
import type { ProfileTable, ProfileRole } from '../database/types.js';

export class ProfileService {
  private repository: ProfileRepository;

  constructor(repository: ProfileRepository) {
    this.repository = repository;
  }

  // 전체 프로필 조회
  async getAll(): Promise<ProfileTable[]> {
    return await this.repository.findAll();
  }

  // ID로 프로필 조회
  async getById(id: string): Promise<ProfileTable | null> {
    const profile = await this.repository.findById(id);
    return profile ?? null;
  }

  // 역할별 프로필 조회
  async getByRole(role: ProfileRole): Promise<ProfileTable[]> {
    return await this.repository.findByRole(role);
  }

  // 프로필 생성
  async create(input: CreateProfileInput): Promise<ProfileTable> {
    // 유효성 검사
    if (!input.name.trim()) {
      throw new Error('프로필 이름은 필수입니다.');
    }

    if (!['admin', 'leader', 'member'].includes(input.role)) {
      throw new Error('유효하지 않은 역할입니다.');
    }

    return await this.repository.create(input);
  }

  // 프로필 수정
  async update(id: string, input: UpdateProfileInput): Promise<ProfileTable> {
    // 존재 여부 확인
    const existing = await this.repository.findById(id);
    if (!existing) {
      throw new Error('프로필을 찾을 수 없습니다.');
    }

    // 유효성 검사
    if (input.name !== undefined && !input.name.trim()) {
      throw new Error('프로필 이름은 필수입니다.');
    }

    if (input.role !== undefined && !['admin', 'leader', 'member'].includes(input.role)) {
      throw new Error('유효하지 않은 역할입니다.');
    }

    const updated = await this.repository.update(id, input);
    if (!updated) {
      throw new Error('프로필 수정에 실패했습니다.');
    }

    return updated;
  }

  // 프로필 삭제
  async delete(id: string): Promise<void> {
    const existing = await this.repository.findById(id);
    if (!existing) {
      throw new Error('프로필을 찾을 수 없습니다.');
    }

    await this.repository.softDelete(id);
  }
}
