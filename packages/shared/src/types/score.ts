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

// 드로잉 도구 타입
export type DrawingTool = 'pen' | 'highlighter' | 'eraser';

export interface DrawingToolSettings {
  tool: DrawingTool;
  color: string;
  strokeWidth: number;
  opacity?: number;
}

// 실시간 드로잉 이벤트
export interface DrawingEvent {
  id: string;
  scoreId: string;
  pageNumber: number;
  userId: string;
  tool: DrawingTool;
  points: Array<{ x: number; y: number }>;
  settings: DrawingToolSettings;
  isComplete: boolean;
  timestamp: Date;
}

// 뷰포트 정보
export interface ScoreViewport {
  scoreId: string;
  pageNumber: number;
  zoom: number;
  offsetX: number;
  offsetY: number;
}