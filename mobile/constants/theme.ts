/**
 * Web（globals.css / quiz-theme.css）と揃えたトークン — ダーク + セージ、目に優しいコントラスト
 */
export const AppColors = {
  background: '#080a0e',
  foreground: '#e9eaee',
  muted: '#8b919f',
  muted2: '#5c6370',
  border: 'rgba(255,255,255,0.07)',
  borderStrong: 'rgba(255,255,255,0.12)',
  surface: '#12151c',
  surfaceDeep: '#0f1218',
  surfaceElevated: '#161a24',
  sidebar: '#0c0e14',
  sidebarBorder: 'rgba(255,255,255,0.06)',
  accentMuted: 'rgba(126, 184, 163, 0.12)',
  accent: '#7eb8a3',
  accentSoft: '#5a957f',
  accentGlow: 'rgba(126, 184, 163, 0.28)',
  quizBorder: 'rgba(126, 184, 163, 0.22)',
  cardBorder: 'rgba(255,255,255,0.1)',
  hairline: 'rgba(255,255,255,0.055)',
  bubbleUser: '#1a2330',
  bubbleAi: '#13161d',
  bubbleUserBorder: 'rgba(126, 184, 163, 0.2)',
  choiceBg: '#11141b',
  inputBg: '#11141b',
  sendBg: '#7eb8a3',
  onAccent: '#0a0c0e',
  correct: '#5dcfb4',
  correctMuted: 'rgba(93, 207, 180, 0.18)',
  wrong: '#e5989b',
  wrongMuted: 'rgba(229, 152, 155, 0.16)',
  danger: '#f87171',
} as const;

export const Radii = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
} as const;

/** カード用の柔らかい浮き影（iOS / Android） */
export const shadowCard = {
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 6 },
  shadowOpacity: 0.22,
  shadowRadius: 16,
  elevation: 6,
} as const;

export const shadowAccent = {
  shadowColor: '#7eb8a3',
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.28,
  shadowRadius: 12,
  elevation: 5,
} as const;
