-- チャット履歴（JPA: com.kairos.ChatMessage → テーブル chat_message）
CREATE TABLE IF NOT EXISTS chat_message (
    id BIGSERIAL PRIMARY KEY,
    role VARCHAR(255),
    content TEXT
);
