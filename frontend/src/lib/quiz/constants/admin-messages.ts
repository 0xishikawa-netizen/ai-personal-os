/** 管理画面（QuizAdmin）の固定文言 */
export const QUIZ_ADMIN_MSG = {
  bootHint:
    'API（例: http://localhost:8080）と PostgreSQL が起動しているか、フロントを一度再起動（npm run dev）したうえで確認してください。',
  /** メモ保存完了（ボタン付近・短いフィードバック用） */
  sectionMemoSaved: '保存しました',
  sectionMemoSaveFailed: 'メモの保存に失敗しました',
  addSectionFailed: 'セクションの追加に失敗しました',
  deleteFailed: '削除に失敗しました',
  saveFailed: '保存に失敗しました',
  exportFailed: 'エクスポートに失敗しました',
  importFailed: 'インポートに失敗しました',
} as const;
