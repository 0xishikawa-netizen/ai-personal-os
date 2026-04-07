'use client';
import '../app/chat.css';
import { useState, useEffect, useRef, useCallback, useReducer } from 'react';
import RichTextarea from './RichTextarea';
import ReactMarkdown from 'react-markdown';
import remarkBreaks from 'remark-breaks';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';

// ─── 定数 ────────────────────────────────────────────────────────────────────
/** ブラウザは同一オリジンのみ。Next の Route Handler が API_PROXY_URL 先へプロキシする。 */
const CHAT_API_PREFIX = '/api/chat';

// ─── 型定義 ───────────────────────────────────────────────────────────────────
type Role = 'user' | 'ai';
type ChatEntry = { role: Role; content: string };

type ChatState = {
  log: ChatEntry[];
  isLoading: boolean;
  regeneratingIndex: number | null;
};

type ChatAction =
  | { type: 'LOAD'; payload: ChatEntry[] }
  | { type: 'APPEND'; payload: ChatEntry }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'REGEN_START'; index: number }
  | { type: 'REGEN_DONE'; index: number; content: string }
  | { type: 'REGEN_FAIL'; index: number }
  | { type: 'EDIT_PROMPT'; index: number };

function chatReducer(state: ChatState, action: ChatAction): ChatState {
  switch (action.type) {
    case 'LOAD':
      return { ...state, log: action.payload };
    case 'APPEND':
      return { ...state, log: [...state.log, action.payload] };
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    case 'REGEN_START':
      return { ...state, regeneratingIndex: action.index };
    case 'REGEN_DONE':
      return {
        ...state,
        regeneratingIndex: null,
        log: state.log.map((e, i) => (i === action.index ? { ...e, content: action.content } : e)),
      };
    case 'REGEN_FAIL':
      return {
        ...state,
        regeneratingIndex: null,
        log: state.log.map((e, i) =>
          i === action.index ? { ...e, content: '⚠️ 再生成に失敗しました。' } : e,
        ),
      };
    case 'EDIT_PROMPT': {
      const { index } = action;
      const hasAiNext = state.log[index + 1]?.role === 'ai';
      return {
        ...state,
        log: state.log.filter((_, i) => i !== index && !(hasAiNext && i === index + 1)),
      };
    }
    default:
      return state;
  }
}

// ─── ユーティリティ ───────────────────────────────────────────────────────────
function stripMarkdown(md: string): string {
  return md
    .replace(/```[\s\S]*?```/g, '')
    .replace(/`[^`]+`/g, (m) => m.slice(1, -1))
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/[#*_~`]/g, '')
    .replace(/\n{2,}/g, '\n')
    .trim();
}

async function copyText(text: string): Promise<void> {
  if (navigator.clipboard) {
    await navigator.clipboard.writeText(text);
  } else {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.cssText = 'position:fixed;opacity:0';
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
  }
}

// ─── アイコン ─────────────────────────────────────────────────────────────────
const Icon = {
  Copy: () => (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect width="14" height="14" x="8" y="8" rx="2" />
      <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
    </svg>
  ),
  Check: () => (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M20 6 9 17l-5-5" />
    </svg>
  ),
  Edit: () => (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
    </svg>
  ),
  Refresh: () => (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
      <path d="M3 3v5h5" />
    </svg>
  ),
  Volume: () => (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
      <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
      <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
    </svg>
  ),
  Dots: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
      <circle cx="5" cy="12" r="2" />
      <circle cx="12" cy="12" r="2" />
      <circle cx="19" cy="12" r="2" />
    </svg>
  ),
  Send: () => (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m22 2-7 20-4-9-9-4Z" />
      <path d="M22 2 11 13" />
    </svg>
  ),
};

// ─── コードブロック ────────────────────────────────────────────────────────────
function CodeBlock({ language, code }: { language: string; code: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await copyText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="code-block">
      <div className="code-block__header">
        <span className="code-block__lang">{language || 'plaintext'}</span>
        <button
          type="button"
          className="code-block__copy"
          onClick={handleCopy}
          title="コードをコピー"
          aria-label="コードをコピー"
        >
          {copied ? <Icon.Check /> : <Icon.Copy />}
          <span>{copied ? 'コピー済み' : 'コピー'}</span>
        </button>
      </div>
      <SyntaxHighlighter
        language={language || 'text'}
        style={oneDark}
        PreTag="div"
        customStyle={{
          margin: 0,
          borderRadius: 0,
          background: '#111',
          fontSize: '0.8125rem',
          padding: '1rem',
        }}
        codeTagProps={{ style: { fontFamily: 'var(--font-mono)' } }}
        showLineNumbers={false}
      >
        {code}
      </SyntaxHighlighter>
    </div>
  );
}

// ─── メッセージメニュー ────────────────────────────────────────────────────────
type MessageMenuProps = {
  entry: ChatEntry;
  index: number;
  isOpen: boolean;
  isRegenerating: boolean;
  canRegenerate: boolean;
  onToggle: () => void;
  onClose: () => void;
  onEdit: () => void;
  onRegenerate: () => void;
  onReadAloud: () => void;
};

function MessageMenu({
  entry,
  isOpen,
  isRegenerating,
  canRegenerate,
  onToggle,
  onClose,
  onEdit,
  onRegenerate,
  onReadAloud,
}: MessageMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);
  const isUser = entry.role === 'user';

  const handleCopy = async () => {
    await copyText(entry.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    onClose();
  };

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isOpen, onClose]);

  return (
    <div className="msg-menu-wrap" ref={menuRef}>
      <button
        type="button"
        className={`msg-menu-trigger${isOpen ? ' msg-menu-trigger--active' : ''}`}
        onClick={onToggle}
        title="メニュー"
        aria-label="メニューを開く"
        aria-haspopup="true"
        aria-expanded={isOpen}
      >
        <Icon.Dots />
      </button>
      {isOpen && (
        <div className={`msg-menu${isUser ? ' msg-menu--user' : ' msg-menu--ai'}`} role="menu">
          <button type="button" className="msg-menu__item" onClick={handleCopy} role="menuitem">
            {copied ? <Icon.Check /> : <Icon.Copy />}
            {isUser ? 'プロンプトをコピー' : '回答をコピー'}
          </button>
          {isUser && (
            <button type="button" className="msg-menu__item" onClick={onEdit} role="menuitem">
              <Icon.Edit />
              プロンプトを編集
            </button>
          )}
          {!isUser && (
            <>
              <button
                type="button"
                className="msg-menu__item"
                onClick={onRegenerate}
                disabled={!canRegenerate || isRegenerating}
                role="menuitem"
              >
                <Icon.Refresh />
                やり直す
              </button>
              <button
                type="button"
                className="msg-menu__item"
                onClick={onReadAloud}
                role="menuitem"
              >
                <Icon.Volume />
                読み上げる
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ─── マークダウンコンポーネント ───────────────────────────────────────────────
const mdComponents = {
  pre: ({ children }: React.ComponentPropsWithoutRef<'pre'>) => <>{children}</>,
  code({
    inline,
    className,
    children,
  }: {
    inline?: boolean;
    className?: string;
    children?: React.ReactNode;
  }) {
    const match = /language-(\w+)/.exec(className ?? '');
    const codeText = String(children ?? '').replace(/\n$/, '');
    // 単行・短いフェンスは Prism に渡さずインラインと同じ見た目にする（[1,2,3] 等でトークン色がばらつくのを防ぐ）
    const useCodeBlock = !inline && match && (codeText.includes('\n') || codeText.length > 300);
    if (useCodeBlock) {
      return <CodeBlock language={match[1]} code={codeText} />;
    }
    return <code className="inline-code">{children}</code>;
  },
};

// ─── ローディングドット ───────────────────────────────────────────────────────
function TypingIndicator() {
  return (
    <div className="typing" aria-label="入力中">
      <span />
      <span />
      <span />
    </div>
  );
}

// ─── メインコンポーネント ─────────────────────────────────────────────────────
export default function ChatPage() {
  const [state, dispatch] = useReducer(chatReducer, {
    log: [],
    isLoading: false,
    regeneratingIndex: null,
  });
  const [input, setInput] = useState('');
  const [openMenuIndex, setOpenMenuIndex] = useState<number | null>(null);
  const [apiReachable, setApiReachable] = useState<boolean | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // 履歴取得（失敗時は apiReachable を false に）
  useEffect(() => {
    fetch(`${CHAT_API_PREFIX}/history`)
      .then((r) => {
        setApiReachable(true);
        return r.ok ? r.json() : [];
      })
      .then((d) => dispatch({ type: 'LOAD', payload: Array.isArray(d) ? d : [] }))
      .catch(() => {
        setApiReachable(false);
        dispatch({ type: 'LOAD', payload: [] });
      });
  }, []);

  // 自動スクロール
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [state.log, state.isLoading]);

  const closeMenu = useCallback(() => setOpenMenuIndex(null), []);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || state.isLoading) return;
    setInput('');
    dispatch({ type: 'APPEND', payload: { role: 'user', content: text } });
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      const res = await fetch(`${CHAT_API_PREFIX}?message=${encodeURIComponent(text)}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.text();
      dispatch({ type: 'APPEND', payload: { role: 'ai', content: data } });
    } catch {
      dispatch({
        type: 'APPEND',
        payload: {
          role: 'ai',
          content:
            '⚠️ バックエンドに接続できません。`docker compose logs api` でエラーを確認してください。',
        },
      });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const regenerateResponse = async (aiIndex: number) => {
    const userMsg = state.log[aiIndex - 1];
    if (userMsg?.role !== 'user') return;
    dispatch({ type: 'REGEN_START', index: aiIndex });
    closeMenu();
    try {
      const res = await fetch(
        `${CHAT_API_PREFIX}?message=${encodeURIComponent(userMsg.content)}`,
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.text();
      dispatch({ type: 'REGEN_DONE', index: aiIndex, content: data });
    } catch {
      dispatch({ type: 'REGEN_FAIL', index: aiIndex });
    }
  };

  const editPrompt = (index: number) => {
    setInput(state.log[index].content);
    dispatch({ type: 'EDIT_PROMPT', index });
    closeMenu();
  };

  const readAloud = useCallback(
    (text: string) => {
      closeMenu();
      if (!window.speechSynthesis) return;
      window.speechSynthesis.cancel();
      const utt = new SpeechSynthesisUtterance(stripMarkdown(text));
      utt.lang = 'ja-JP';
      const jaVoice = speechSynthesis.getVoices().find((v) => v.lang.startsWith('ja'));
      if (jaVoice) utt.voice = jaVoice;
      speechSynthesis.speak(utt);
    },
    [closeMenu],
  );

  const isEmpty = state.log.length === 0 && !state.isLoading;

  return (
    <main className="chat-root flex min-h-0 w-full flex-1 flex-col">
      <header className="chat-header">
        <div className="chat-header__dot" aria-hidden />
        <div>
          <div className="chat-header__title">チャット</div>
          <p className="chat-header__sub">AI アシスタントと会話</p>
        </div>
      </header>

      <div className="chat-body">
        {isEmpty && (
          <div className="chat-empty">
            {apiReachable === false && (
              <div className="chat-empty__error-wrap">
                <p className="chat-empty__error">
                  バックエンドに接続できません。ローカルでは API（:8080）と{' '}
                  <code>frontend/.env.local</code> の <code>API_PROXY_URL</code>、本番では Vercel の{' '}
                  <code>API_PROXY_URL</code> を確認してください。
                </p>
                <p className="chat-empty__error-hint">
                  起動するにはプロジェクトルートで <code>docker compose up -d api</code>{' '}
                  を実行してください。起動後は「再試行」をクリック。
                </p>
                <button
                  type="button"
                  className="chat-empty__retry"
                  onClick={() => {
                    setApiReachable(null);
                    fetch(`${CHAT_API_PREFIX}/history`)
                      .then((r) => {
                        setApiReachable(true);
                        return r.ok ? r.json() : [];
                      })
                      .then((d) => dispatch({ type: 'LOAD', payload: Array.isArray(d) ? d : [] }))
                      .catch(() => setApiReachable(false));
                  }}
                >
                  再試行
                </button>
              </div>
            )}
            <p className="chat-empty__heading">なにか聞いてみてください</p>
            <p className="chat-empty__sub">Enter で送信 / Shift+Enter で改行</p>
          </div>
        )}

        {state.log.map((entry, i) => {
          const isUser = entry.role === 'user';
          const isRegenerating = state.regeneratingIndex === i;

          return (
            <div key={i} className={`msg-row${isUser ? ' msg-row--user' : ' msg-row--ai'}`}>
              <div
                className={`msg-bubble${isUser ? ' msg-bubble--user' : ' msg-bubble--ai'}${isRegenerating ? ' msg-bubble--regen' : ''}`}
              >
                {isRegenerating && <div className="msg-bubble__overlay">再生成中…</div>}
                <div className="msg-content">
                  <ReactMarkdown
                    remarkPlugins={[remarkBreaks, remarkGfm]}
                    components={mdComponents as never}
                  >
                    {entry.content}
                  </ReactMarkdown>
                </div>
              </div>
              <MessageMenu
                entry={entry}
                index={i}
                isOpen={openMenuIndex === i}
                isRegenerating={isRegenerating}
                canRegenerate={state.regeneratingIndex === null && !state.isLoading}
                onToggle={() => setOpenMenuIndex(openMenuIndex === i ? null : i)}
                onClose={closeMenu}
                onEdit={() => editPrompt(i)}
                onRegenerate={() => regenerateResponse(i)}
                onReadAloud={() => readAloud(entry.content)}
              />
            </div>
          );
        })}

        {state.isLoading && (
          <div className="msg-row msg-row--ai">
            <div className="msg-bubble msg-bubble--ai">
              <TypingIndicator />
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      <footer className="chat-footer">
        <div className="input-wrap">
          <RichTextarea
            value={input}
            onChange={setInput}
            onSend={sendMessage}
            disabled={state.isLoading}
            className="input-textarea"
            placeholder="メッセージを入力… (⌘B 太字 / ⌘E コード / ```+Enter でコードブロック)"
          />
          <button
            type="button"
            className={`input-send${state.isLoading || !input.trim() ? ' input-send--disabled' : ''}`}
            onClick={sendMessage}
            disabled={state.isLoading || !input.trim()}
            aria-label="送信"
            title="送信"
          >
            <Icon.Send />
          </button>
        </div>
      </footer>
    </main>
  );
}
