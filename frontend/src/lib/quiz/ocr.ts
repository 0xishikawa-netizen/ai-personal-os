/**
 * OCR テキストから問題文・選択肢をざっくり抽出（Kindle スクショ等の下書き用）
 * Tesseract は日本語で字間スペース・★誤認（衣）・フッターを混ぜやすいので前処理あり。
 */

export type OcrDraft = {
  question: string;
  choices: { label: string; text: string }[];
};

/** ひら・カタ・漢字・々・読点 など（ASCII 単語 GET/POST は壊さないよう除外） */
const CJK_CHUNK =
  /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF々〆〻ー\u3001\u3002]/;

/**
 * Kindle 等で出やすい「語 中 間 ス ペ ー ス」を CJK 間だけ詰める
 */
export function collapseJapaneseSpacing(text: string): string {
  let out = text;
  let prev = '';
  let guard = 0;
  while (out !== prev && guard < 48) {
    prev = out;
    out = out.replace(
      new RegExp(`(${CJK_CHUNK.source})\\s+(${CJK_CHUNK.source})`, 'gu'),
      '$1$2',
    );
    guard += 1;
  }
  return out;
}

/** 1 行がフッター・重要度・星の誤認っぽい場合は捨てる */
function isNoiseLine(line: string): boolean {
  const t = line.trim();
  if (!t) return true;
  if (/^[\d０-９]+[-－][\d０-９]+$/.test(t)) return true;
  if (/ページ.*中.*ページ|ページ目/.test(t)) return true;
  if (/^\d{1,4}\s*%\s*$/.test(t)) return true;
  if (/%\s*$/.test(t) && /ペ\s*ー\s*ジ|ページ/.test(t)) return true;
  if (/重要\s*度/.test(t)) return true;
  if (/^(衣\s*){2,}/.test(t)) return true;
  if (/(衣\s*){3,}/.test(t)) return true;
  if (/^問題\s*[\d０-９]+[-－][\d０-９]+$/i.test(t)) return true;
  return false;
}

/** 衣の連続（★の誤認）を除去 */
function stripClothStars(line: string): string {
  return line
    .replace(/衣(\s*衣)*/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

/**
 * OCR 結合テキストの前処理（管理画面から利用）
 */
export function preprocessOcrText(raw: string): string {
  let text = raw.replace(/\r\n/g, '\n').trim();

  const lines = text.split('\n').map((l) => l.trim());
  const kept = lines
    .map((l) => stripClothStars(l))
    .filter((l) => l.length > 0 && !isNoiseLine(l));

  text = kept.join('\n');
  text = collapseJapaneseSpacing(text);
  text = text.replace(/([A-Ea-e])\s*[\.．、]\s*/g, (_m, p1: string) => `${String(p1).toUpperCase()}. `);
  text = text.replace(
    /[0-9０-９]{1,4}\s*ペ\s*ー\s*ジ\s*中\s*の\s*[0-9０-９]{1,4}\s*ペ\s*ー\s*ジ\s*目\s*[0-9０-９]{0,3}\s*%?/gu,
    '',
  );
  text = text.replace(/[0-9０-９]{1,4}ページ中の[0-9０-９]{1,4}ページ目\s*[0-9０-９]{0,3}\s*%?/g, '');
  text = text.replace(/\s*重要\s*度[^\n]*/gu, '');

  return text.trim();
}

/** 選択肢: 「A. GET」「A．GET」「A GET」（正規化後） */
const LABEL_RE = /^[\s]*([A-Ea-e])[\s]*[\.．):：]?\s*(.+)$/;

export function parseOcrTextToDraft(raw: string): OcrDraft {
  const normalized = preprocessOcrText(raw);
  const lines = normalized
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  const choices: { label: string; text: string }[] = [];
  const questionLines: string[] = [];

  for (const line of lines) {
    const m = line.match(LABEL_RE);
    if (m) {
      const label = m[1].toUpperCase();
      let body = m[2].trim();
      if (['A', 'B', 'C', 'D', 'E'].includes(label)) {
        body = collapseJapaneseSpacing(body);
        if (/^[A-Z]+$/.test(body)) {
          choices.push({ label, text: body });
          continue;
        }
        if (body.length > 0) {
          choices.push({ label, text: body });
          continue;
        }
      }
    }

    const soloMethod = line.match(/^[\s]*([A-E])[\s]+([A-Z]{2,10})[\s]*$/i);
    if (soloMethod && choices.length < 5) {
      const label = soloMethod[1].toUpperCase();
      const body = soloMethod[2].toUpperCase();
      if (['A', 'B', 'C', 'D', 'E'].includes(label)) {
        choices.push({ label, text: body });
        continue;
      }
    }

    questionLines.push(line);
  }

  let question = questionLines.join('').trim();
  question = collapseJapaneseSpacing(question);
  question = question.replace(/^(問題\s*)?[\d１-９]+[-－][\d１-９]+\s*/i, '');
  question = stripClothStars(question);

  if (choices.length === 0) {
    return { question: normalized.trim(), choices: [] };
  }

  return {
    question: question || normalized.trim(),
    choices,
  };
}
