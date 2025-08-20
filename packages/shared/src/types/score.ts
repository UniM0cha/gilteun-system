export interface Score {
  id: string;
  worshipId: string;
  title: string;
  filePath: string;
  orderIndex: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface DrawingData {
  id: string;
  scoreId: string;
  pageNumber: number;
  userId: string;
  strokeData: string; // SVG 또는 Canvas path data
  color: string;
  strokeWidth: number;
  timestamp: Date;
}

export interface ScoreState {
  scoreId: string;
  currentPage: number;
  totalPages: number;
  drawings: DrawingData[];
  lastUpdated: Date;
}

export interface PageNavigation {
  scoreId: string;
  pageNumber: number;
  userId: string;
  timestamp: Date;
}