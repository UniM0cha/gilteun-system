// 주석 서비스

import { AnnotationRepository, CreateAnnotationInput, UpdateAnnotationInput } from '../repositories/AnnotationRepository.js';
import type { AnnotationTable, AnnotationTool } from '../database/types.js';

// 프론트엔드에서 사용할 주석 타입
export interface AnnotationDto {
  id: string;
  songId: string;
  profileId: string;
  svgPath: string;
  color: string;
  tool: AnnotationTool;
  strokeWidth: number | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
}

// DB 엔티티를 DTO로 변환
function toDto(entity: AnnotationTable): AnnotationDto {
  return {
    id: entity.id,
    songId: entity.song_id,
    profileId: entity.profile_id,
    svgPath: entity.svg_path,
    color: entity.color,
    tool: entity.tool,
    strokeWidth: entity.stroke_width,
    metadata: entity.metadata ? JSON.parse(entity.metadata) : null,
    createdAt: entity.created_at,
    updatedAt: entity.updated_at,
  };
}

export class AnnotationService {
  private repository: AnnotationRepository;

  constructor(repository: AnnotationRepository) {
    this.repository = repository;
  }

  // ID로 주석 조회
  async getById(id: string): Promise<AnnotationDto | null> {
    const annotation = await this.repository.findById(id);
    return annotation ? toDto(annotation) : null;
  }

  // 찬양별 주석 조회
  async getBySongId(songId: string): Promise<AnnotationDto[]> {
    const annotations = await this.repository.findBySongId(songId);
    return annotations.map(toDto);
  }

  // 찬양 + 프로필별 주석 조회
  async getBySongAndProfile(songId: string, profileId: string): Promise<AnnotationDto[]> {
    const annotations = await this.repository.findBySongAndProfile(songId, profileId);
    return annotations.map(toDto);
  }

  // 주석 생성
  async create(input: CreateAnnotationInput): Promise<AnnotationDto> {
    // 유효성 검사
    if (!input.songId) {
      throw new Error('찬양 ID는 필수입니다.');
    }

    if (!input.profileId) {
      throw new Error('프로필 ID는 필수입니다.');
    }

    if (!input.svgPath) {
      throw new Error('SVG 경로는 필수입니다.');
    }

    const validTools: AnnotationTool[] = ['pen', 'highlighter', 'eraser', 'text', 'shape'];
    if (!validTools.includes(input.tool)) {
      throw new Error('유효하지 않은 도구입니다.');
    }

    const annotation = await this.repository.create(input);
    return toDto(annotation);
  }

  // 주석 수정
  async update(id: string, input: UpdateAnnotationInput): Promise<AnnotationDto> {
    const existing = await this.repository.findById(id);
    if (!existing) {
      throw new Error('주석을 찾을 수 없습니다.');
    }

    if (input.tool !== undefined) {
      const validTools: AnnotationTool[] = ['pen', 'highlighter', 'eraser', 'text', 'shape'];
      if (!validTools.includes(input.tool)) {
        throw new Error('유효하지 않은 도구입니다.');
      }
    }

    const updated = await this.repository.update(id, input);
    if (!updated) {
      throw new Error('주석 수정에 실패했습니다.');
    }

    return toDto(updated);
  }

  // 주석 삭제
  async delete(id: string): Promise<void> {
    const existing = await this.repository.findById(id);
    if (!existing) {
      throw new Error('주석을 찾을 수 없습니다.');
    }

    await this.repository.softDelete(id);
  }

  // 프로필의 특정 찬양 주석 모두 삭제
  async deleteByProfileAndSong(profileId: string, songId: string): Promise<number> {
    return await this.repository.deleteByProfileAndSong(profileId, songId);
  }

  // 벌크 생성
  async createBulk(inputs: CreateAnnotationInput[]): Promise<AnnotationDto[]> {
    // 유효성 검사
    for (const input of inputs) {
      if (!input.songId || !input.profileId || !input.svgPath) {
        throw new Error('필수 필드가 누락되었습니다.');
      }
    }

    const annotations = await this.repository.createBulk(inputs);
    return annotations.map(toDto);
  }
}
