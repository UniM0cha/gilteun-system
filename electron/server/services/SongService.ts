// 찬양 서비스

import { SongRepository, CreateSongInput, UpdateSongInput } from '../repositories/SongRepository.js';
import type { SongTable } from '../database/types.js';

export class SongService {
  private repository: SongRepository;

  constructor(repository: SongRepository) {
    this.repository = repository;
  }

  // ID로 찬양 조회
  async getById(id: string): Promise<SongTable | null> {
    const song = await this.repository.findById(id);
    return song ?? null;
  }

  // 예배별 찬양 조회
  async getByWorshipId(worshipId: string): Promise<SongTable[]> {
    return await this.repository.findByWorshipId(worshipId);
  }

  // 찬양 생성
  async create(input: Omit<CreateSongInput, 'orderIndex'>): Promise<SongTable> {
    // 유효성 검사
    if (!input.title.trim()) {
      throw new Error('찬양 제목은 필수입니다.');
    }

    if (!input.worshipId) {
      throw new Error('예배 ID는 필수입니다.');
    }

    // 자동으로 다음 순서 번호 할당
    const orderIndex = await this.repository.getNextOrderIndex(input.worshipId);

    return await this.repository.create({
      ...input,
      orderIndex,
    });
  }

  // 찬양 수정
  async update(id: string, input: UpdateSongInput): Promise<SongTable> {
    // 존재 여부 확인
    const existing = await this.repository.findById(id);
    if (!existing) {
      throw new Error('찬양을 찾을 수 없습니다.');
    }

    // 유효성 검사
    if (input.title !== undefined && !input.title.trim()) {
      throw new Error('찬양 제목은 필수입니다.');
    }

    const updated = await this.repository.update(id, input);
    if (!updated) {
      throw new Error('찬양 수정에 실패했습니다.');
    }

    return updated;
  }

  // 찬양 삭제
  async delete(id: string): Promise<void> {
    const existing = await this.repository.findById(id);
    if (!existing) {
      throw new Error('찬양을 찾을 수 없습니다.');
    }

    await this.repository.softDelete(id);
  }

  // 찬양 순서 변경
  async reorder(worshipId: string, songIds: string[]): Promise<void> {
    // 해당 예배의 찬양인지 확인
    const songs = await this.repository.findByWorshipId(worshipId);
    const songIdSet = new Set(songs.map((s) => s.id));

    for (const id of songIds) {
      if (!songIdSet.has(id)) {
        throw new Error(`찬양 ${id}은(는) 해당 예배에 속하지 않습니다.`);
      }
    }

    // 순서 업데이트
    const orders = songIds.map((id, index) => ({ id, orderIndex: index }));
    await this.repository.updateOrders(orders);
  }
}
