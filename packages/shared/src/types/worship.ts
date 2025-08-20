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
  typeId: string;
  date: Date;
  title: string;
  description?: string;
  scoreIds: string[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Score {
  id: string;
  worshipId: string;
  title: string;
  filename: string;
  filepath: string;
  order: number;
  pageCount: number;
  createdAt: Date;
  updatedAt: Date;
}