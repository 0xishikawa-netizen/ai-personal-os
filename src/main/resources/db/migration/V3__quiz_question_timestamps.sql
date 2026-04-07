-- 旧スキーマの quiz_question に監査列が無い場合向け（Hibernate validate 用）

ALTER TABLE quiz_question
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE quiz_question
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

UPDATE quiz_question SET created_at = NOW() WHERE created_at IS NULL;
UPDATE quiz_question SET updated_at = NOW() WHERE updated_at IS NULL;

ALTER TABLE quiz_question
    ALTER COLUMN created_at SET NOT NULL;
ALTER TABLE quiz_question
    ALTER COLUMN updated_at SET NOT NULL;
