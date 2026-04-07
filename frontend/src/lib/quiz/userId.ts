const KEY = 'kairos-quiz-user-id';

export function getQuizUserId(): string {
  if (typeof window === 'undefined') return 'anonymous';
  let id = localStorage.getItem(KEY);
  if (!id) {
    id = `u-${crypto.randomUUID().slice(0, 12)}`;
    localStorage.setItem(KEY, id);
  }
  return id;
}
