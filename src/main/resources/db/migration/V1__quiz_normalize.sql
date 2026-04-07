-- Kairos クイズ: 正規化スキーマ + 旧 choices_json / answers_json からの移行

CREATE TABLE IF NOT EXISTS quiz_section (
    id           VARCHAR(64) PRIMARY KEY,
    name         VARCHAR(512),
    description  TEXT,
    sort_order   INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS quiz_chapter (
    id          VARCHAR(64) PRIMARY KEY,
    section_id  VARCHAR(64) NOT NULL REFERENCES quiz_section (id) ON DELETE CASCADE,
    title       VARCHAR(512) NOT NULL,
    sort_order  INTEGER NOT NULL DEFAULT 0
);

-- 新規環境用: quiz_question を丸ごと作成
CREATE TABLE IF NOT EXISTS quiz_question (
    id             VARCHAR(64) PRIMARY KEY,
    chapter_id     VARCHAR(64) NOT NULL REFERENCES quiz_chapter (id) ON DELETE CASCADE,
    question       TEXT        NOT NULL,
    explanation    TEXT,
    difficulty     INTEGER     NOT NULL DEFAULT 1,
    question_type  VARCHAR(10) NOT NULL DEFAULT 'single',
    image_url      TEXT,
    sort_order     INTEGER     NOT NULL DEFAULT 0,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Hibernate 既存テーブル向け: 不足カラムのみ追加
ALTER TABLE quiz_question
    ADD COLUMN IF NOT EXISTS question_type VARCHAR(10) DEFAULT 'single';
ALTER TABLE quiz_question
    ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE quiz_question
    ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;
ALTER TABLE quiz_question
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE quiz_question
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

UPDATE quiz_question SET question_type = 'single' WHERE question_type IS NULL;
UPDATE quiz_question SET sort_order = 0 WHERE sort_order IS NULL;
UPDATE quiz_question SET created_at = NOW() WHERE created_at IS NULL;
UPDATE quiz_question SET updated_at = NOW() WHERE updated_at IS NULL;

ALTER TABLE quiz_question
    ALTER COLUMN question_type SET NOT NULL;
ALTER TABLE quiz_question
    ALTER COLUMN question_type SET DEFAULT 'single';
ALTER TABLE quiz_question
    ALTER COLUMN sort_order SET NOT NULL;
ALTER TABLE quiz_question
    ALTER COLUMN sort_order SET DEFAULT 0;
ALTER TABLE quiz_question
    ALTER COLUMN created_at SET NOT NULL;
ALTER TABLE quiz_question
    ALTER COLUMN updated_at SET NOT NULL;

DO $$
    BEGIN
        IF NOT EXISTS (SELECT 1
                       FROM pg_constraint
                       WHERE conname = 'quiz_question_type_chk') THEN
            ALTER TABLE quiz_question
                ADD CONSTRAINT quiz_question_type_chk CHECK (question_type IN ('single', 'multiple'));
        END IF;
    END $$;

CREATE TABLE IF NOT EXISTS quiz_choice (
    id          VARCHAR(40) PRIMARY KEY,
    question_id VARCHAR(64) NOT NULL REFERENCES quiz_question (id) ON DELETE CASCADE,
    label       CHAR(1)     NOT NULL CHECK (label IN ('A', 'B', 'C', 'D', 'E')),
    body        TEXT        NOT NULL,
    image_url   TEXT,
    is_correct  BOOLEAN     NOT NULL DEFAULT FALSE,
    UNIQUE (question_id, label)
);

CREATE INDEX IF NOT EXISTS idx_choice_question ON quiz_choice (question_id);
CREATE INDEX IF NOT EXISTS idx_choice_correct ON quiz_choice (question_id, is_correct);

CREATE TABLE IF NOT EXISTS quiz_tag (
    id   VARCHAR(40) PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS quiz_question_tag (
    question_id VARCHAR(64) NOT NULL REFERENCES quiz_question (id) ON DELETE CASCADE,
    tag_id        VARCHAR(40) NOT NULL REFERENCES quiz_tag (id) ON DELETE CASCADE,
    PRIMARY KEY (question_id, tag_id)
);

CREATE TABLE IF NOT EXISTS quiz_answer_log (
    id            VARCHAR(40) PRIMARY KEY,
    user_id       VARCHAR(200) NOT NULL,
    question_id   VARCHAR(64) NOT NULL REFERENCES quiz_question (id) ON DELETE CASCADE,
    chosen        TEXT[]       NOT NULL,
    is_correct    BOOLEAN      NOT NULL,
    time_spent_ms INTEGER,
    answered_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_log_user ON quiz_answer_log (user_id);
CREATE INDEX IF NOT EXISTS idx_log_question ON quiz_answer_log (question_id);
CREATE INDEX IF NOT EXISTS idx_log_user_date ON quiz_answer_log (user_id, answered_at DESC);

-- JSON カラムから quiz_choice へ移行（未移行かつ JSON ありのときのみ）
INSERT INTO quiz_choice (id, question_id, label, body, image_url, is_correct)
SELECT DISTINCT ON (q.id, lab)
    'c-' || substr(md5(q.id || (elem ->> 'label')), 1, 32),
    q.id,
    lab::CHAR(1),
    COALESCE(elem ->> 'text', ''),
    NULL,
    EXISTS (SELECT 1
            FROM jsonb_array_elements_text(
                         CASE
                             WHEN q.answers_json IS NULL OR btrim(q.answers_json) = '' THEN '[]'::jsonb
                             ELSE q.answers_json::jsonb END) AS ans(lbl)
            WHERE upper(ans.lbl) = lab)
FROM quiz_question q
         CROSS JOIN LATERAL jsonb_array_elements(
        CASE
            WHEN q.choices_json IS NOT NULL AND btrim(q.choices_json) <> '' THEN q.choices_json::jsonb
            ELSE '[]'::jsonb END
        ) AS elem
         CROSS JOIN LATERAL (SELECT upper(substr(trim(elem ->> 'label'), 1, 1)) AS lab) AS l
WHERE EXISTS (SELECT 1
              FROM information_schema.columns
              WHERE table_name = 'quiz_question'
                AND column_name = 'choices_json')
  AND NOT EXISTS (SELECT 1 FROM quiz_choice c WHERE c.question_id = q.id)
  AND lab IN ('A', 'B', 'C', 'D', 'E')
ORDER BY q.id, lab;

-- question_type を正解数から補正
UPDATE quiz_question q
SET question_type = CASE
                        WHEN (SELECT COUNT(*)::int
                              FROM quiz_choice c
                              WHERE c.question_id = q.id
                                AND c.is_correct) > 1 THEN 'multiple'
                        ELSE 'single' END
WHERE EXISTS (SELECT 1
              FROM information_schema.columns
              WHERE table_name = 'quiz_question'
                AND column_name = 'choices_json');

ALTER TABLE quiz_question DROP COLUMN IF EXISTS choices_json;
ALTER TABLE quiz_question DROP COLUMN IF EXISTS answers_json;
