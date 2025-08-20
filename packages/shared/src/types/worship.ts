export interface WorshipType {
  id: string;
  name: string;
  description?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Worship {
  id: string;
  type: string; // 예배 유형 이름
  date: Date;
  name: string; // 예배 이름
  scoreIds: string[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}