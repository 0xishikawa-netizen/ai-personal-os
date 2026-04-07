-- V1 の末尾（choices_json 削除）まで到達していない DB 向け。
-- アプリは quiz_choice テーブルのみ使用するため、choices_json が残ると NOT NULL 違反で INSERT が失敗する。

-- JSON から quiz_choice へ未移行の行があれば移行（V1 と同ロジック）
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
              WHERE table_schema = current_schema()
                AND table_name = 'quiz_question'
                AND column_name = 'choices_json')
  AND NOT EXISTS (SELECT 1 FROM quiz_choice c WHERE c.question_id = q.id)
  AND lab IN ('A', 'B', 'C', 'D', 'E')
ORDER BY q.id, lab;

UPDATE quiz_question q
SET question_type = CASE
                        WHEN (SELECT COUNT(*)::int
                              FROM quiz_choice c
                              WHERE c.question_id = q.id
                                AND c.is_correct) > 1 THEN 'multiple'
                        ELSE 'single' END
WHERE EXISTS (SELECT 1
              FROM information_schema.columns
              WHERE table_schema = current_schema()
                AND table_name = 'quiz_question'
                AND column_name = 'choices_json');

ALTER TABLE quiz_question DROP COLUMN IF EXISTS choices_json;
ALTER TABLE quiz_question DROP COLUMN IF EXISTS answers_json;
