'use client';

import ReactMarkdown from 'react-markdown';
import remarkBreaks from 'remark-breaks';
import remarkGfm from 'remark-gfm';

type Props = {
  /** 大分類名（見出し脇の表示用） */
  sectionTitle: string;
  markdown: string;
};

/**
 * 大分類に貼った Markdown を、参考書の「本章のポイント」風に表示する。
 */
export function SectionStudyMemo({ sectionTitle, markdown }: Props) {
  return (
    <article className="section-study-memo">
      <header className="section-study-memo__head">
        <div className="section-study-memo__badge" aria-hidden>
          大分類
        </div>
        <h2 className="section-study-memo__title">{sectionTitle}</h2>
      </header>
      <div className="section-study-memo__body">
        <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]}>{markdown}</ReactMarkdown>
      </div>
    </article>
  );
}
