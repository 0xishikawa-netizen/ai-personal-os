'use client';
/**
 * RichTextarea — contenteditable によるリアルタイム Markdown レンダリング
 *
 * ショートカット:
 *   Cmd/Ctrl + B  → **太字**
 *   Cmd/Ctrl + E  → `インラインコード`
 *   Cmd/Ctrl + K  → コードブロック挿入
 *   Enter         → onSend
 *   Shift+Enter   → 改行
 */

import { useRef, useEffect, useCallback } from 'react';
import type { MutableRefObject } from 'react';
import { marked } from 'marked';

export type RichTextareaProps = {
  value: string;
  onChange: (v: string) => void;
  onSend: () => void;
  disabled?: boolean;
  placeholder?: string;
  maxHeight?: number;
  className?: string;
};

/** DOM を深さ優先で走査し、`<br>` を `\n` 1 文字としてプレーン化（innerText に依存しない） */
function domToPlainString(root: Node): string {
  let text = '';
  const walk = (node: Node) => {
    for (let child = node.firstChild; child; child = child.nextSibling) {
      if (child.nodeType === Node.TEXT_NODE) {
        text += child.nodeValue ?? '';
      } else if (child.nodeType === Node.ELEMENT_NODE) {
        const element = child as HTMLElement;
        if (element.tagName === 'BR') {
          text += '\n';
        } else {
          walk(element);
        }
      }
    }
  };
  walk(root);
  return text;
}

function getPlainText(el: HTMLElement): string {
  return domToPlainString(el);
}

type TextOrBr = { kind: 'text'; node: Text } | { kind: 'br'; node: HTMLElement };

function collectSegments(root: Node): TextOrBr[] {
  const out: TextOrBr[] = [];
  for (const child of root.childNodes) {
    if (child.nodeType === Node.TEXT_NODE) {
      out.push({ kind: 'text', node: child as Text });
    } else if (child.nodeType === Node.ELEMENT_NODE) {
      const hel = child as HTMLElement;
      if (hel.tagName === 'BR') {
        out.push({ kind: 'br', node: hel });
      } else {
        out.push(...collectSegments(child));
      }
    }
  }
  return out;
}

function getCursorOffset(el: HTMLElement): number {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return 0;
  const range = sel.getRangeAt(0);
  const pre = document.createRange();
  pre.selectNodeContents(el);
  pre.setEnd(range.endContainer, range.endOffset);
  const div = document.createElement('div');
  div.appendChild(pre.cloneContents());
  return domToPlainString(div).length;
}

function setCursorOffset(el: HTMLElement, offset: number) {
  let remaining = offset;
  const segments = collectSegments(el);
  const applyAt = (node: Node, pos: number) => {
    const r = document.createRange();
    r.setStart(node, pos);
    r.collapse(true);
    const sel = window.getSelection();
    sel?.removeAllRanges();
    sel?.addRange(r);
  };

  if (segments.length === 0) {
    const r = document.createRange();
    r.selectNodeContents(el);
    r.collapse(true);
    const sel = window.getSelection();
    sel?.removeAllRanges();
    sel?.addRange(r);
    return;
  }

  for (const seg of segments) {
    if (seg.kind === 'text') {
      const len = seg.node.length;
      if (remaining <= len) {
        applyAt(seg.node, remaining);
        return;
      }
      remaining -= len;
    } else {
      if (remaining === 0) {
        const r = document.createRange();
        r.setStartBefore(seg.node);
        r.collapse(true);
        const sel = window.getSelection();
        sel?.removeAllRanges();
        sel?.addRange(r);
        return;
      }
      if (remaining === 1) {
        const r = document.createRange();
        r.setStartAfter(seg.node);
        r.collapse(true);
        const sel = window.getSelection();
        sel?.removeAllRanges();
        sel?.addRange(r);
        return;
      }
      remaining -= 1;
    }
  }

  const last = segments[segments.length - 1]!;
  if (last.kind === 'text') {
    applyAt(last.node, last.node.length);
  } else {
    const r = document.createRange();
    r.setStartAfter(last.node);
    r.collapse(true);
    const sel = window.getSelection();
    sel?.removeAllRanges();
    sel?.addRange(r);
  }
}

function renderMarkdown(text: string): string {
  if (!text) return '';
  let html = marked.parseInline(text, { breaks: true }) as string;
  html = html.replace(/\n/g, '<br>');
  if (text.endsWith('\n') && !html.endsWith('<br>')) {
    html += '<br>';
  }
  return html;
}

function adjustInputHeight(el: HTMLElement, maxHeight: number) {
  el.style.height = 'auto';
  el.style.height = `${Math.min(el.scrollHeight, maxHeight)}px`;
}

function insertAround(
  el: HTMLElement,
  value: string,
  onChange: (v: string) => void,
  wrap: string,
  skipRef: MutableRefObject<boolean>,
  maxHeight: number,
) {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return;
  if (!el.contains(sel.anchorNode)) return;

  const end = getCursorOffset(el);
  const selectedText = sel.toString();
  const start = end - selectedText.length;
  const inserted = selectedText ? `${wrap}${selectedText}${wrap}` : `${wrap}${wrap}`;
  const next = value.slice(0, start) + inserted + value.slice(end);
  const newPos = selectedText ? start + inserted.length : start + wrap.length;

  skipRef.current = true;
  onChange(next);
  el.innerHTML = renderMarkdown(next) || '';
  setCursorOffset(el, newPos);
  adjustInputHeight(el, maxHeight);
}

export default function RichTextarea({
  value,
  onChange,
  onSend,
  disabled = false,
  placeholder = 'メッセージ入力… (⌘B 太字 / ⌘E コード / ⌘K コードブロック)',
  maxHeight = 240,
  className = '',
}: RichTextareaProps) {
  const ref = useRef<HTMLDivElement>(null);
  const isComposing = useRef(false);
  const skipNextInput = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (getPlainText(el) !== value) {
      el.innerHTML = renderMarkdown(value) || '';
      adjustInputHeight(el, maxHeight);
    }
  }, [value, maxHeight]);

  const handleInput = useCallback(() => {
    const el = ref.current;
    if (!el || isComposing.current) return;
    if (skipNextInput.current) {
      skipNextInput.current = false;
      return;
    }
    const cursor = getCursorOffset(el);
    const plain = getPlainText(el);
    onChange(plain);
    el.innerHTML = renderMarkdown(plain) || '';
    requestAnimationFrame(() => setCursorOffset(el, cursor));
    adjustInputHeight(el, maxHeight);
  }, [onChange, maxHeight]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      const el = ref.current;
      if (!el) return;
      const isMod = e.metaKey || e.ctrlKey;

      if (e.key === 'Enter' && !e.shiftKey && !isComposing.current) {
        e.preventDefault();
        onSend();
        return;
      }
      if (isMod && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        insertAround(el, value, onChange, '**', skipNextInput, maxHeight);
        return;
      }
      if (isMod && e.key.toLowerCase() === 'e') {
        e.preventDefault();
        insertAround(el, value, onChange, '`', skipNextInput, maxHeight);
        return;
      }
      if (isMod && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        const cursor = getCursorOffset(el);
        const next = value.slice(0, cursor) + '```\n\n```' + value.slice(cursor);
        skipNextInput.current = true;
        onChange(next);
        el.innerHTML = renderMarkdown(next) || '';
        setCursorOffset(el, cursor + 4);
        adjustInputHeight(el, maxHeight);
        return;
      }
    },
    [value, onChange, onSend, maxHeight],
  );

  return (
    <div
      ref={ref}
      role="textbox"
      aria-label="メッセージ入力"
      aria-multiline="true"
      contentEditable={!disabled}
      suppressContentEditableWarning
      onInput={handleInput}
      onKeyDown={handleKeyDown}
      onCompositionStart={() => {
        isComposing.current = true;
      }}
      onCompositionEnd={() => {
        isComposing.current = false;
        handleInput();
      }}
      data-placeholder={placeholder}
      className={className}
      style={{
        minHeight: '22px',
        maxHeight: `${maxHeight}px`,
        overflowY: 'auto',
        outline: 'none',
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
        cursor: disabled ? 'not-allowed' : 'text',
        opacity: disabled ? 0.5 : 1,
      }}
    />
  );
}
