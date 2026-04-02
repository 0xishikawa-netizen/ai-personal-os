import type { QuizStore } from './types';

/** 初回サンプル（HTTP など）— 任意ジャンルに差し替え可能 */
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
      question: 'HTTP/1.1 で、クライアントとサーバーが一度に確立する接続の最大数は（同一オリジン）理論上は？',
      choices: [
        { label: 'A', text: '1 接続のみ' },
        { label: 'B', text: '仕様上は複数パイプライン可能（実装依存）' },
        { label: 'C', text: '無制限' },
        { label: 'D', text: '常に 6 接続のみ' },
        { label: 'E', text: 'HTTPS では 0' },
      ],
      answers: ['B'],
      explanation:
        'HTTP/1.1 で同一オリジンあたりの同時接続数はブラウザ実装で制限されることが多いですが、仕様上パイプライン等で複数リクエストを扱う設計があります（問題は「学習用の例」です）。',
      difficulty: 2,
    },
    {
      id: 'q-1-2',
      chapterId: 'ch-http-1',
      question: 'ステータスコード 404 は何を意味する？',
      choices: [
        { label: 'A', text: 'サーバーエラー' },
        { label: 'B', text: 'リダイレクト' },
        { label: 'C', text: '認証が必要' },
        { label: 'D', text: 'リソースが見つからない' },
        { label: 'E', text: '成功' },
      ],
      answers: ['D'],
      explanation: '404 Not Found は要求されたリソースがサーバーに存在しないことを示します。',
      difficulty: 1,
    },
    {
      id: 'q-2-1',
      chapterId: 'ch-http-2',
      question: 'REST でリソースの新規作成に使うことが多い HTTP メソッドは？',
      choices: [
        { label: 'A', text: 'GET' },
        { label: 'B', text: 'POST' },
        { label: 'C', text: 'HEAD' },
        { label: 'D', text: 'TRACE' },
        { label: 'E', text: 'OPTIONS' },
      ],
      answers: ['B'],
      explanation: 'POST はエンティティの作成や処理のトリガーに広く使われます（設計により PUT も）。',
      difficulty: 2,
    },
  ],
};
