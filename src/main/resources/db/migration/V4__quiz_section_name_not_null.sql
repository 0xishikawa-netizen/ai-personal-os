-- Hibernate / 既存 DB のどちらでも name を NOT NULL に統一

UPDATE quiz_section SET name = '' WHERE name IS NULL;

ALTER TABLE quiz_section
    ALTER COLUMN name SET NOT NULL;
