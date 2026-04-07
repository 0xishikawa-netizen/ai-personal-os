import type { QuizStore } from './types';

/** 初回サンプル（ローカルデモ用）— 本番データは API / DB */
export const seedQuizStore: QuizStore = {
  sections: [
    { id: 'sec-net', name: 'ネットワーク', description: 'HTTP / TLS など', order: 0 },
    { id: 'sec-general', name: '一般', description: 'その他ジャンル用', order: 1 },
  ],
  chapters: [
    { id: 'ch-http-1', sectionId: 'sec-net', title: 'HTTP 基礎', order: 0 },
    { id: 'ch-http-2', sectionId: 'sec-net', title: 'HTTP メソッド', order: 1 },
  ],
  questions: [
    {
      id: 'q-1-1',
      chapterId: 'ch-http-1',
      body: 'HTTP/1.1 で、クライアントとサーバーが一度に確立する接続の最大数は（同一オリジン）理論上は？',
      choices: [
        { id: 'c-a1', label: 'A', body: '1 接続のみ', isCorrect: false },
        { id: 'c-b1', label: 'B', body: '仕様上は複数パイプライン可能（実装依存）', isCorrect: true },
        { id: 'c-c1', label: 'C', body: '無制限', isCorrect: false },
        { id: 'c-d1', label: 'D', body: '常に 6 接続のみ', isCorrect: false },
        { id: 'c-e1', label: 'E', body: 'HTTPS では 0', isCorrect: false },
      ],
      explanation:
        'HTTP/1.1 で同一オリジンあたりの同時接続数はブラウザ実装で制限されることが多いですが、仕様上パイプライン等で複数リクエストを扱う設計があります（問題は「学習用の例」です）。',
      difficulty: 2,
      questionType: 'single',
      sortOrder: 0,
    },
    {
      id: 'q-1-2',
      chapterId: 'ch-http-1',
      body: 'ステータスコード 404 は何を意味する？',
      choices: [
        { id: 'c-a2', label: 'A', body: 'サーバーエラー', isCorrect: false },
        { id: 'c-b2', label: 'B', body: 'リダイレクト', isCorrect: false },
        { id: 'c-c2', label: 'C', body: '認証が必要', isCorrect: false },
        { id: 'c-d2', label: 'D', body: 'リソースが見つからない', isCorrect: true },
        { id: 'c-e2', label: 'E', body: '成功', isCorrect: false },
      ],
      explanation: '404 Not Found は要求されたリソースがサーバーに存在しないことを示します。',
      difficulty: 1,
      questionType: 'single',
      sortOrder: 1,
    },
    {
      id: 'q-2-1',
      chapterId: 'ch-http-2',
      body: 'REST でリソースの新規作成に使うことが多い HTTP メソッドは？',
      choices: [
        { id: 'c-a3', label: 'A', body: 'GET', isCorrect: false },
        { id: 'c-b3', label: 'B', body: 'POST', isCorrect: true },
        { id: 'c-c3', label: 'C', body: 'HEAD', isCorrect: false },
        { id: 'c-d3', label: 'D', body: 'TRACE', isCorrect: false },
        { id: 'c-e3', label: 'E', body: 'OPTIONS', isCorrect: false },
      ],
      explanation: 'POST はエンティティの作成や処理のトリガーに広く使われます（設計により PUT も）。',
      difficulty: 2,
      questionType: 'single',
      sortOrder: 0,
    },
  ],
};
