/**
 * Kairos クイズ — 公開 API
 *
 * 構成:
 * - `api/*` … HTTP クライアント（client / store / sections / chapters / questions / answer / backup）
 * - `api/normalize.ts` … レスポンス正規化（バレルからは export しない・内部用）
 * - `import/json.ts` … JSON インポートの検証・送信
 * - `constants/*` … ラベル・管理画面の固定文言
 * - `selectors.ts` … ストア参照ヘルパ
 * - `types.ts` / `ocr.ts` / `userId.ts` / `seed.ts` … 従来どおり
 *
 * 互換: `@/lib/quiz/storage` はこのバレルへの re-export。
 */

export * from './types';
export * from './ocr';
export * from './userId';
export * from './seed';

export * from './constants/labels';
export * from './constants/admin-messages';

export * from './api/client';
export * from './api/store';
export * from './api/sections';
export * from './api/chapters';
export * from './api/questions';
export * from './api/answer';
export * from './api/backup';

export * from './import/json';
export * from './selectors';
