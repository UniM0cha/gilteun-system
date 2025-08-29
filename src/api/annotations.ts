import axios from 'axios';
import { CreateAnnotationRequest, UpdateAnnotationRequest, Annotation, ApiResponse } from '../types';

/**
 * 주석 API 클라이언트
 * SVG 패스 기반 벡터 데이터 저장 시스템
 */

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

class AnnotationAPI {
  /**
   * 모든 주석 조회 (찬양 별)
   */
  async getAnnotations(songId: number): Promise<Annotation[]> {
    try {
      const response = await axios.get<ApiResponse<Annotation[]>>(`${API_BASE}/annotations/song/${songId}`);
      return response.data.data || [];
    } catch (error) {
      console.error('주석 조회 실패:', error);
      return [];
    }
  }

  /**
   * 사용자별 주석 조회
   */
  async getUserAnnotations(songId: number, userId: string): Promise<Annotation[]> {
    try {
      const response = await axios.get<ApiResponse<Annotation[]>>(
        `${API_BASE}/annotations/song/${songId}/user/${userId}`
      );
      return response.data.data || [];
    } catch (error) {
      console.error('사용자 주석 조회 실패:', error);
      return [];
    }
  }

  /**
   * 주석 생성 (SVG 패스 저장)
   */
  async createAnnotation(annotation: CreateAnnotationRequest): Promise<Annotation | null> {
    try {
      const response = await axios.post<ApiResponse<Annotation>>(`${API_BASE}/annotations`, annotation);
      return response.data.data || null;
    } catch (error) {
      console.error('주석 생성 실패:', error);
      return null;
    }
  }

  /**
   * 주석 업데이트
   */
  async updateAnnotation(id: number, updates: UpdateAnnotationRequest): Promise<Annotation | null> {
    try {
      const response = await axios.patch<ApiResponse<Annotation>>(`${API_BASE}/annotations/${id}`, updates);
      return response.data.data || null;
    } catch (error) {
      console.error('주석 업데이트 실패:', error);
      return null;
    }
  }

  /**
   * 주석 삭제
   */
  async deleteAnnotation(id: number): Promise<boolean> {
    try {
      await axios.delete(`${API_BASE}/annotations/${id}`);
      return true;
    } catch (error) {
      console.error('주석 삭제 실패:', error);
      return false;
    }
  }

  /**
   * 사용자의 모든 주석 삭제 (특정 찬양)
   */
  async deleteUserAnnotations(songId: number, userId: string): Promise<boolean> {
    try {
      await axios.delete(`${API_BASE}/annotations/song/${songId}/user/${userId}`);
      return true;
    } catch (error) {
      console.error('사용자 주석 삭제 실패:', error);
      return false;
    }
  }

  /**
   * 주석 레이어 전체를 하나의 SVG로 합치기 (내보내기용)
   */
  async exportAnnotationsSVG(songId: number, userIds?: string[]): Promise<string> {
    try {
      const params = userIds ? { userIds: userIds.join(',') } : {};
      const response = await axios.get<ApiResponse<{ svg: string }>>(
        `${API_BASE}/annotations/song/${songId}/export`,
        { params }
      );
      return response.data.data?.svg || '';
    } catch (error) {
      console.error('주석 SVG 내보내기 실패:', error);
      return '';
    }
  }

  /**
   * 주석 통계 (찬양별 사용자별 주석 수)
   */
  async getAnnotationStats(songId: number): Promise<{ userId: string; userName: string; count: number }[]> {
    try {
      const response = await axios.get<ApiResponse<{ userId: string; userName: string; count: number }[]>>(
        `${API_BASE}/annotations/song/${songId}/stats`
      );
      return response.data.data || [];
    } catch (error) {
      console.error('주석 통계 조회 실패:', error);
      return [];
    }
  }

  /**
   * 벌크 주석 저장 (여러 주석을 한 번에)
   */
  async bulkCreateAnnotations(annotations: CreateAnnotationRequest[]): Promise<Annotation[]> {
    try {
      const response = await axios.post<ApiResponse<Annotation[]>>(`${API_BASE}/annotations/bulk`, {
        annotations
      });
      return response.data.data || [];
    } catch (error) {
      console.error('벌크 주석 생성 실패:', error);
      return [];
    }
  }
}

export const annotationApi = new AnnotationAPI();