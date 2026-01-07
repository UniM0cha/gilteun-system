// 예배 서비스

import { WorshipRepository, CreateWorshipInput, UpdateWorshipInput } from '../repositories/WorshipRepository.js';
import type { WorshipTable } from '../database/types.js';

export class WorshipService {
  private repository: WorshipRepository;

  constructor(repository: WorshipRepository) {
    this.repository = repository;
  }

  // 전체 예배 조회
  async getAll(): Promise<WorshipTable[]> {
    return await this.repository.findAll();
  }

  // ID로 예배 조회
  async getById(id: string): Promise<WorshipTable | null> {
    const worship = await this.repository.findById(id);
    return worship ?? null;
  }

  // 최근 예배 조회
  async getRecent(limit: number = 10): Promise<WorshipTable[]> {
    return await this.repository.findRecent(limit);
  }

  // 날짜 범위로 예배 조회
  async getByDateRange(startDate: string, endDate: string): Promise<WorshipTable[]> {
    return await this.repository.findByDateRange(startDate, endDate);
  }

  // 예배 생성
  async create(input: CreateWorshipInput): Promise<WorshipTable> {
    // 유효성 검사
    if (!input.title.trim()) {
      throw new Error('예배 제목은 필수입니다.');
    }

    if (!input.date) {
      throw new Error('예배 날짜는 필수입니다.');
    }

    // 날짜 형식 검사 (YYYY-MM-DD)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(input.date)) {
      throw new Error('날짜 형식이 올바르지 않습니다. (YYYY-MM-DD)');
    }

    return await this.repository.create(input);
  }

  // 예배 수정
  async update(id: string, input: UpdateWorshipInput): Promise<WorshipTable> {
    // 존재 여부 확인
    const existing = await this.repository.findById(id);
    if (!existing) {
      throw new Error('예배를 찾을 수 없습니다.');
    }

    // 유효성 검사
    if (input.title !== undefined && !input.title.trim()) {
      throw new Error('예배 제목은 필수입니다.');
    }

    if (input.date !== undefined) {
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(input.date)) {
        throw new Error('날짜 형식이 올바르지 않습니다. (YYYY-MM-DD)');
      }
    }

    const updated = await this.repository.update(id, input);
    if (!updated) {
      throw new Error('예배 수정에 실패했습니다.');
    }

    return updated;
  }

  // 예배 삭제
  async delete(id: string): Promise<void> {
    const existing = await this.repository.findById(id);
    if (!existing) {
      throw new Error('예배를 찾을 수 없습니다.');
    }

    await this.repository.softDelete(id);
  }
}
