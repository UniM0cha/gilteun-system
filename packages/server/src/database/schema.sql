-- 악기 테이블
CREATE TABLE IF NOT EXISTS instruments (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    icon TEXT NOT NULL,
    order_index INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT 1,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 사용자 테이블
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('session', 'leader', 'admin')),
    instrument_id TEXT NOT NULL,
    avatar TEXT,
    custom_commands TEXT, -- JSON 배열로 저장
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (instrument_id) REFERENCES instruments (id)
);

-- 예배 유형 테이블
CREATE TABLE IF NOT EXISTS worship_types (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    is_active BOOLEAN NOT NULL DEFAULT 1,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 예배 테이블
CREATE TABLE IF NOT EXISTS worships (
    id TEXT PRIMARY KEY,
    type_id TEXT NOT NULL,
    name TEXT NOT NULL,
    date DATE NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT 1,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (type_id) REFERENCES worship_types (id)
);

-- 악보 테이블
CREATE TABLE IF NOT EXISTS scores (
    id TEXT PRIMARY KEY,
    worship_id TEXT NOT NULL,
    title TEXT NOT NULL,
    file_path TEXT NOT NULL,
    order_index INTEGER NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (worship_id) REFERENCES worships (id) ON DELETE CASCADE
);

-- 드로잉 데이터 테이블
CREATE TABLE IF NOT EXISTS score_drawings (
    id TEXT PRIMARY KEY,
    score_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    drawing_data TEXT NOT NULL, -- JSON으로 저장
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (score_id) REFERENCES scores (id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users (id)
);

-- 명령 이력 테이블
CREATE TABLE IF NOT EXISTS commands (
    id TEXT PRIMARY KEY,
    sender_id TEXT NOT NULL,
    worship_id TEXT NOT NULL,
    content TEXT NOT NULL,
    target_type TEXT NOT NULL CHECK (target_type IN ('all', 'group', 'individual')),
    target_ids TEXT, -- JSON 배열로 저장 (특정 대상인 경우)
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at DATETIME NOT NULL,
    FOREIGN KEY (sender_id) REFERENCES users (id),
    FOREIGN KEY (worship_id) REFERENCES worships (id)
);

-- 기본 데이터 삽입
INSERT OR IGNORE INTO instruments (id, name, icon, order_index) VALUES
    ('drum', '드럼', '🥁', 1),
    ('bass', '베이스', '🎸', 2),
    ('guitar', '기타', '🎸', 3),
    ('keyboard', '키보드', '🎹', 4),
    ('vocal', '보컬', '🎤', 5);

INSERT OR IGNORE INTO worship_types (id, name) VALUES
    ('sunday_1st', '주일 1부예배'),
    ('sunday_2nd', '주일 2부예배'),
    ('sunday_3rd', '주일 3부예배'),
    ('youth', '청년예배'),
    ('wednesday', '수요예배'),
    ('friday', '금요기도회');