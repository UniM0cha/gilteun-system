// 공통 데이터베이스 타입 정의

export interface DatabaseRow {
  [key: string]: string | number | boolean | null;
}

export interface PreparedStatement<T extends DatabaseRow = DatabaseRow> {
  run: (...params: (string | number | boolean | null)[]) => { changes: number };
  get: (...params: (string | number | boolean | null)[]) => T | undefined;
  all: (...params: (string | number | boolean | null)[]) => T[];
}

export interface DatabaseInterface {
  prepare?: <T extends DatabaseRow = DatabaseRow>(sql: string) => PreparedStatement<T>;
  exec?: (sql: string) => void;
  pragma?: (pragma: string) => void;
  transaction?: <T>(fn: () => T) => T;
  close?: () => void;
  // JSON DB methods
  run?: (sql: string, params?: (string | number | boolean | null)[]) => { changes: number };
  get?: <T extends DatabaseRow = DatabaseRow>(
    sql: string,
    params?: (string | number | boolean | null)[]
  ) => T | undefined;
  all?: <T extends DatabaseRow = DatabaseRow>(sql: string, params?: (string | number | boolean | null)[]) => T[];
}

// Service specific row types
export interface ScoreRow extends DatabaseRow {
  id: string;
  worship_id: string;
  title: string;
  file_path: string;
  order_index: number;
  created_at: string;
  updated_at: string;
}

export interface MaxOrderRow extends DatabaseRow {
  max_order: number | null;
}

export interface WorshipRow extends DatabaseRow {
  id: string;
  type_name: string;
  date: string;
  name: string;
  is_active: number;
  created_at: string;
  updated_at: string;
}

export interface ScoreIdRow extends DatabaseRow {
  id: string;
}

export interface DrawingRow extends DatabaseRow {
  id: string;
  score_id: string;
  page_number: number;
  user_id: string;
  drawing_type: string;
  drawing_data: string;
  created_at: string;
}

export interface SystemSettingRow extends DatabaseRow {
  key: string;
  value: string;
}

export interface CommandTemplateRow extends DatabaseRow {
  id: string;
  name: string;
  template: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// JSON Database에서 사용하는 DrawingData 타입
export interface JsonDrawingData {
  id: string | number | boolean | null;
  score_id: string | number | boolean | null;
  page_number: string | number | boolean | null;
  user_id: string | number | boolean | null;
  drawing_type: string | number | boolean | null;
  drawing_data: string | number | boolean | null;
  created_at: string | number | boolean | null;
}

// JSON Database 인터페이스
export interface JsonDatabaseInterface {
  prepare: (sql: string) => PreparedStatement<DatabaseRow>;
}
