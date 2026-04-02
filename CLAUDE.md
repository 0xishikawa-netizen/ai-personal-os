# Kairos — Claude 向けプロジェクト概要

モノレポ: Spring Boot API + Next.js フロント + Expo モバイル。

## 構成

| 部分 | パス | 技術 |
|------|------|------|
| API | ルート `src/main/java`, `Dockerfile`, `compose.yml` | Java 25, Spring Boot 4, JPA, LangChain4j (Gemini) |
| Web | `frontend/` | Next.js 16, React |
| Mobile | `mobile/` | Expo 54, expo-router |

## 起動（開発）

- **一括**: ルートの `start-all.command`（macOS）。既定は同梱 PostgreSQL（`docker compose --profile local-db`）。`.env` に `db:5432` が必要。
- **API のみ**: `docker compose --profile local-db up -d`（ローカル DB）または `USE_BUNDLED_POSTGRES=0` で外部 DB のみ。
- **フロント**: `frontend/` で `npm run dev`（ポート 3000/3001）。
- **モバイル**: `mobile/` で `npx expo start`。

## 環境変数

- ルート `.env`（gitignore）: `DB_URL`, `DB_USER`, `DB_PASSWORD`, `GEMINI_API_KEY` など。
- 例: `.env.local.example`。

## API

- ベース URL（ローカル）: `http://localhost:8080`
- チャット: `GET/POST /api/chat`, `GET /api/chat/history`
- クイズ API: `/api/quiz/*`（フロントは `/kairos-quiz`・`/kairos-quiz/admin`）

## Claude Desktop 連携

手順は `docs/claude-desktop.md` を参照。MCP（filesystem）でこのリポジトリを読み書き可能にできる。
