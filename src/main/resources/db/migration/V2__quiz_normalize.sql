-- V1 適用済み（または手動作成）でオブジェクトが既にある DB でも通るよう冪等にする。

-- ① question_type と image_url を quiz_question に追加
ALTER TABLE quiz_question
  ADD COLUMN IF NOT EXISTS question_type VARCHAR(10) NOT NULL DEFAULT 'single'
    CHECK (question_type IN ('single', 'multiple')),
  ADD COLUMN IF NOT EXISTS image_url TEXT,
  ADD COLUMN IF NOT EXISTS sort_order INT NOT NULL DEFAULT 0;

-- ② 選択肢テーブル（choices_json 廃止・独立化）
CREATE TABLE IF NOT EXISTS quiz_choice (
  id          VARCHAR(40)  PRIMARY KEY,
  question_id VARCHAR(64)  NOT NULL
                REFERENCES quiz_question(id) ON DELETE CASCADE,
  label       CHAR(1)      NOT NULL CHECK (label IN ('A','B','C','D','E')),
  body        TEXT         NOT NULL,
  image_url   TEXT,
  is_correct  BOOLEAN      NOT NULL DEFAULT FALSE,
  UNIQUE (question_id, label)
);

CREATE INDEX IF NOT EXISTS idx_choice_question ON quiz_choice (question_id);
CREATE INDEX IF NOT EXISTS idx_choice_correct  ON quiz_choice (question_id, is_correct);

-- ③ タグ
CREATE TABLE IF NOT EXISTS quiz_tag (
  id    VARCHAR(40)  PRIMARY KEY,
  name  VARCHAR(100) NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS quiz_question_tag (
  question_id  VARCHAR(64) NOT NULL REFERENCES quiz_question(id) ON DELETE CASCADE,
  tag_id       VARCHAR(40) NOT NULL REFERENCES quiz_tag(id)      ON DELETE CASCADE,
  PRIMARY KEY (question_id, tag_id)
);

-- ④ 回答ログ
CREATE TABLE IF NOT EXISTS quiz_answer_log (
  id            VARCHAR(40)  PRIMARY KEY,
  user_id       VARCHAR(200) NOT NULL,
  question_id   VARCHAR(64)  NOT NULL REFERENCES quiz_question(id) ON DELETE CASCADE,
  chosen        TEXT[]       NOT NULL,
  is_correct    BOOLEAN      NOT NULL,
  time_spent_ms INT,
  answered_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_log_user      ON quiz_answer_log (user_id);
CREATE INDEX IF NOT EXISTS idx_log_question  ON quiz_answer_log (question_id);
CREATE INDEX IF NOT EXISTS idx_log_user_date ON quiz_answer_log (user_id, answered_at DESC);
