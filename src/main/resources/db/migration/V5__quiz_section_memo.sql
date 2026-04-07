-- 大分類（セクション）に「本章のポイント」など貼り付け用のメモ（Markdown 想定）

ALTER TABLE quiz_section
    ADD COLUMN IF NOT EXISTS memo TEXT;
