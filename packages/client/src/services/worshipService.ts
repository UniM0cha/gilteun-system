import type { Worship } from '@gilteun/shared';
import { apiService } from './api';

export class WorshipApiService {
  async getWorships(date?: string): Promise<Worship[]> {
    const endpoint = date ? `/worships?date=${encodeURIComponent(date)}` : '/worships';
    return apiService.get<Worship[]>(endpoint);
  }

  async getWorshipById(id: string): Promise<Worship> {
    return apiService.get<Worship>(`/worships/${id}`);
  }

  async createWorship(data: {
    typeId: string;
    name: string;
    date: string;
  }): Promise<Worship> {
    return apiService.post<Worship>('/worships', data);
  }

  async updateWorship(
    id: string, 
    data: {
      name?: string;
      date?: string;
      isActive?: boolean;
    }
  ): Promise<Worship> {
    return apiService.put<Worship>(`/worships/${id}`, data);
  }

  async deleteWorship(id: string): Promise<{ message: string }> {
    return apiService.delete(`/worships/${id}`);
  }

  async getWorshipTypes(): Promise<Array<{ id: string; name: string }>> {
    return apiService.get('/worship-types');
  }
}

export const worshipApiService = new WorshipApiService();