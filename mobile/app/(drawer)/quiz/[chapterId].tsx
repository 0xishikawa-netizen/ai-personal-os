import { useNavigation } from '@react-navigation/native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useLayoutEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { KairosBackground } from '@/components/KairosBackground';
import { AppColors, Radii, shadowCard } from '@/constants/theme';
import {
  correctLabels,
  getQuestionsByChapter,
  getQuizUserId,
  getSectionForChapter,
  labelsEqual,
  loadStore,
  submitAnswer,
} from '@/lib/quiz';
import type { AnswerRecord, QuizQuestion, QuizStore } from '@/lib/quiz/types';

type CardState = { selected: string[]; locked: boolean; showExplain: boolean };

function GoldStars({ n }: { n: number }) {
  const c = Math.min(5, Math.max(1, Math.round(n)));
  return (
    <View style={styles.starsRow} accessibilityLabel={`難易度 ${c}`}>
      {Array.from({ length: 5 }, (_, i) => (
        <Text
          key={i}
          style={[styles.starGlyph, { color: i < c ? AppColors.accent : 'rgba(126,184,163,0.22)' }]}
        >
          ★
        </Text>
      ))}
    </View>
  );
}

export default function QuizChapterScreen() {
  const { chapterId: rawId } = useLocalSearchParams<{ chapterId: string }>();
  const chapterId = typeof rawId === 'string' ? rawId : '';
  const router = useRouter();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

  const [store, setStore] = useState<QuizStore | null>(null);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [step, setStep] = useState<'quiz' | 'results'>('quiz');
  const [cards, setCards] = useState<Record<string, CardState>>({});
  const [records, setRecords] = useState<AnswerRecord[]>([]);
  const [loadErr, setLoadErr] = useState<string | null>(null);

  useEffect(() => {
    if (!chapterId) return;
    let cancelled = false;
    void (async () => {
      try {
        const st = await loadStore();
        if (cancelled) return;
        const qs = getQuestionsByChapter(st, chapterId);
        setStore(st);
        setQuestions(qs);
        const init: Record<string, CardState> = {};
        for (const q of qs) {
          init[q.id] = { selected: [], locked: false, showExplain: false };
        }
        setCards(init);
        setRecords([]);
        setStep('quiz');
        setLoadErr(null);
      } catch {
        if (!cancelled) {
          setLoadErr('読み込みに失敗しました');
          setStore(null);
          setQuestions([]);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [chapterId]);

  const chapterTitle = useMemo(() => {
    if (!store || !chapterId) return '';
    return store.chapters.find((c) => c.id === chapterId)?.title ?? '';
  }, [store, chapterId]);

  const sectionName = useMemo(() => {
    if (!store || !chapterId) return '';
    return getSectionForChapter(store, chapterId)?.name ?? '';
  }, [store, chapterId]);

  useLayoutEffect(() => {
    navigation.setOptions({ title: chapterTitle || '解答' });
  }, [navigation, chapterTitle]);

  const correctCount = useMemo(() => records.filter((r) => r.correct).length, [records]);

  const logAnswer = useCallback(async (qid: string, selected: string[], ok: boolean) => {
    setRecords((prev) => {
      const rest = prev.filter((r) => r.questionId !== qid);
      return [...rest, { questionId: qid, selected: [...selected].sort(), correct: ok }];
    });
    try {
      const uid = await getQuizUserId();
      await submitAnswer({ userId: uid, questionId: qid, chosen: selected });
    } catch {
      /* 記録失敗は UI を止めない */
    }
  }, []);

  const onSelectSingle = useCallback(
    (qid: string, label: string) => {
      const q = questions.find((x) => x.id === qid);
      if (!q || correctLabels(q).length > 1) return;
      const selected = [label];
      setCards((prev) => ({
        ...prev,
        [qid]: { ...prev[qid]!, selected, locked: true },
      }));
      const ok = labelsEqual(selected, correctLabels(q));
      void logAnswer(qid, selected, ok);
    },
    [questions, logAnswer],
  );

  const onToggleChoice = useCallback((qid: string, label: string) => {
    setCards((prev) => {
      const cur = prev[qid];
      if (!cur || cur.locked) return prev;
      const set = new Set(cur.selected);
      if (set.has(label)) set.delete(label);
      else set.add(label);
      return { ...prev, [qid]: { ...cur, selected: [...set].sort() } };
    });
  }, []);

  const onConfirmMulti = useCallback(
    (qid: string) => {
      const q = questions.find((x) => x.id === qid);
      if (!q || correctLabels(q).length <= 1) return;
      setCards((prev) => {
        const cur = prev[qid];
        if (!cur || cur.locked) return prev;
        const selected = cur.selected;
        if (selected.length === 0) return prev;
        const ok = labelsEqual(selected, correctLabels(q));
        queueMicrotask(() => void logAnswer(qid, [...selected], ok));
        return { ...prev, [qid]: { ...cur, locked: true } };
      });
    },
    [questions, logAnswer],
  );

  const allAnswered =
    questions.length > 0 && questions.every((q) => cards[q.id]?.locked);

  const resetQuiz = useCallback(() => {
    const init: Record<string, CardState> = {};
    for (const q of questions) {
      init[q.id] = { selected: [], locked: false, showExplain: false };
    }
    setCards(init);
    setRecords([]);
    setStep('quiz');
  }, [questions]);

  if (loadErr || (!questions.length && store)) {
    return (
      <KairosBackground>
        <View style={[styles.center, { paddingBottom: insets.bottom }]}>
          <Text style={styles.muted}>{loadErr ?? 'このチャプターに問題がありません。'}</Text>
          <Pressable style={styles.linkBtn} onPress={() => router.push('/quiz')}>
            <Text style={styles.linkBtnText}>問題集ホームへ</Text>
          </Pressable>
        </View>
      </KairosBackground>
    );
  }

  if (!store || !questions.length) {
    return (
      <KairosBackground>
        <View style={[styles.center, { paddingBottom: insets.bottom }]}>
          <ActivityIndicator size="large" color={AppColors.accent} />
          <Text style={styles.muted}>読み込み中…</Text>
        </View>
      </KairosBackground>
    );
  }

  if (step === 'results') {
    const pct = questions.length ? Math.round((correctCount / questions.length) * 100) : 0;
    return (
      <KairosBackground>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.resultsContent,
          { paddingBottom: insets.bottom + 24, paddingTop: 16 },
        ]}
      >
        <Text style={styles.resultsTitle}>今回の結果</Text>
        <View style={styles.resultCard}>
          <Text style={styles.resultLabel}>正答率</Text>
          <Text style={styles.resultPct}>{pct}%</Text>
          <Text style={styles.resultSub}>
            正解 {correctCount} / {questions.length} 問
          </Text>
        </View>
        <View style={styles.rowGap}>
          <Pressable style={styles.outlineBtn} onPress={() => router.push('/quiz')}>
            <Text style={styles.outlineBtnText}>ホームへ</Text>
          </Pressable>
          <Pressable style={styles.primaryBtn} onPress={resetQuiz}>
            <Text style={styles.primaryBtnText}>もう一度</Text>
          </Pressable>
        </View>
      </ScrollView>
      </KairosBackground>
    );
  }

  return (
    <KairosBackground>
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={[
        styles.quizContent,
        { paddingBottom: insets.bottom + 32, paddingTop: 12 },
      ]}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.chapterHeader}>
        <Text style={styles.sectionKicker}>{sectionName}</Text>
        <Text style={styles.chapterTitleLarge}>{chapterTitle}</Text>
        <Text style={styles.scoreLine}>
          正解 {correctCount} / {questions.length}
        </Text>
      </View>

      {questions.map((q, i) => {
        const state = cards[q.id] ?? { selected: [], locked: false, showExplain: false };
        const isMulti = q.questionType === 'multiple' || correctLabels(q).length > 1;
        const wrong = state.locked && !labelsEqual(state.selected, correctLabels(q));
        const correctSet = new Set(correctLabels(q));

        return (
          <View key={q.id} style={styles.qCard}>
            <View style={styles.qCardHead}>
              <Text style={styles.qNum}>問題 {i + 1}</Text>
              <GoldStars n={q.difficulty} />
            </View>
            <Text style={styles.qBody}>{q.body}</Text>
            {q.imageUrl && /^https?:\/\//i.test(q.imageUrl) ? (
              <Image source={{ uri: q.imageUrl }} style={styles.qImage} resizeMode="contain" />
            ) : null}

            {isMulti && !state.locked ? (
              <Text style={styles.multiHint}>複数正解のときはすべて選び「回答する」で確定してください。</Text>
            ) : null}

            {q.choices.map((ch) => {
              const picked = state.selected.includes(ch.label);
              const isCorrectChoice = correctSet.has(ch.label);
              let borderStyle: ViewStyle = styles.choiceBorder;
              let labelColor = AppColors.accentSoft as string;

              if (!state.locked && isMulti && picked) {
                borderStyle = styles.choiceBorderPick;
                labelColor = AppColors.accent;
              }
              if (state.locked) {
                if (picked && isCorrectChoice) {
                  borderStyle = styles.choiceBorderOk;
                  labelColor = AppColors.correct;
                } else if (picked && !isCorrectChoice) {
                  borderStyle = styles.choiceBorderNg;
                  labelColor = AppColors.wrong;
                } else if (!picked && isCorrectChoice && wrong) {
                  borderStyle = styles.choiceBorderOk;
                  labelColor = AppColors.correct;
                }
              }

              return (
                <Pressable
                  key={ch.id}
                  disabled={state.locked}
                  onPress={() => (isMulti ? onToggleChoice(q.id, ch.label) : onSelectSingle(q.id, ch.label))}
                  style={({ pressed }) => [
                    styles.choice,
                    borderStyle,
                    pressed && !state.locked && styles.choicePressed,
                  ]}
                >
                  <Text style={[styles.choiceLabel, { color: labelColor }]}>{ch.label}.</Text>
                  <Text style={styles.choiceBody}>{ch.body}</Text>
                </Pressable>
              );
            })}

            {isMulti && !state.locked ? (
              <Pressable
                style={[styles.confirmBtn, state.selected.length === 0 && styles.confirmBtnDisabled]}
                disabled={state.selected.length === 0}
                onPress={() => onConfirmMulti(q.id)}
              >
                <Text style={styles.confirmBtnText}>
                  回答する
                  {state.selected.length > 0 ? `（${[...state.selected].sort().join('・')}）` : ''}
                </Text>
              </Pressable>
            ) : null}

            {state.locked && wrong ? (
              <View style={styles.wrongRow}>
                <Text style={styles.wrongMark}>×</Text>
                <Text style={styles.wrongText}>不正解</Text>
              </View>
            ) : null}

            {state.locked && wrong ? (
              <View style={styles.explainBlock}>
                {!state.showExplain ? (
                  <Pressable
                    onPress={() =>
                      setCards((prev) => ({
                        ...prev,
                        [q.id]: { ...prev[q.id]!, showExplain: true },
                      }))
                    }
                    style={styles.explainBtn}
                  >
                    <Text style={styles.explainBtnText}>解説を見る</Text>
                  </Pressable>
                ) : q.explanation?.trim() ? (
                  <Text style={styles.explainText}>{q.explanation.trim()}</Text>
                ) : (
                  <Text style={styles.muted}>解説はありません。</Text>
                )}
              </View>
            ) : null}
          </View>
        );
      })}

      {allAnswered ? (
        <Pressable style={styles.resultsNavBtn} onPress={() => setStep('results')}>
          <Text style={styles.resultsNavBtnText}>結果を見る</Text>
        </Pressable>
      ) : null}
    </ScrollView>
    </KairosBackground>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: 'transparent' },
  quizContent: { paddingHorizontal: 16 },
  resultsContent: { paddingHorizontal: 20 },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    gap: 16,
  },
  muted: { fontSize: 15, color: AppColors.muted, textAlign: 'center' },
  linkBtn: { marginTop: 8, paddingVertical: 12, paddingHorizontal: 20 },
  linkBtnText: { fontSize: 16, fontWeight: '600', color: AppColors.accent },
  chapterHeader: {
    alignItems: 'center',
    marginBottom: 22,
    paddingBottom: 18,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: AppColors.sidebarBorder,
  },
  sectionKicker: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 2.5,
    color: AppColors.accentSoft,
    textTransform: 'uppercase',
  },
  chapterTitleLarge: {
    marginTop: 8,
    fontSize: 22,
    fontWeight: '700',
    color: AppColors.foreground,
    textAlign: 'center',
  },
  scoreLine: { marginTop: 10, fontSize: 16, fontWeight: '600', color: AppColors.accent },
  qCard: {
    marginBottom: 28,
    borderRadius: Radii.xl,
    borderWidth: 1,
    borderColor: AppColors.cardBorder,
    backgroundColor: 'rgba(22, 26, 36, 0.92)',
    padding: 20,
    ...shadowCard,
  },
  qCardHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  qNum: { fontSize: 15, fontWeight: '600', color: AppColors.accentSoft },
  starsRow: { flexDirection: 'row' },
  starGlyph: { fontSize: 14 },
  qBody: { fontSize: 16, lineHeight: 24, color: AppColors.foreground },
  qImage: {
    marginTop: 12,
    width: '100%',
    height: 200,
    borderRadius: Radii.md,
    borderWidth: 1,
    borderColor: AppColors.cardBorder,
    backgroundColor: AppColors.surfaceDeep,
  },
  multiHint: { marginTop: 12, fontSize: 13, color: AppColors.muted, lineHeight: 20 },
  choice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 10,
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: Radii.md,
    backgroundColor: AppColors.choiceBg,
  },
  choicePressed: { opacity: 0.9 },
  choiceBorder: { borderWidth: 1, borderColor: AppColors.cardBorder },
  choiceBorderPick: { borderWidth: 2, borderColor: AppColors.accent },
  choiceBorderOk: { borderWidth: 2, borderColor: AppColors.correct },
  choiceBorderNg: { borderWidth: 2, borderColor: AppColors.wrong },
  choiceLabel: { width: 28, fontSize: 15, fontWeight: '700' },
  choiceBody: { flex: 1, fontSize: 15, lineHeight: 22, color: AppColors.foreground },
  confirmBtn: {
    marginTop: 14,
    paddingVertical: 14,
    borderRadius: Radii.md,
    borderWidth: 2,
    borderColor: AppColors.quizBorder,
    backgroundColor: AppColors.accentMuted,
    alignItems: 'center',
  },
  confirmBtnDisabled: { opacity: 0.4 },
  confirmBtnText: { fontSize: 15, fontWeight: '700', color: AppColors.accent },
  wrongRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 14 },
  wrongMark: {
    width: 26,
    height: 26,
    textAlign: 'center',
    lineHeight: 24,
    fontSize: 16,
    fontWeight: '700',
    color: AppColors.wrong,
    borderWidth: 2,
    borderColor: AppColors.wrong,
    borderRadius: 13,
    overflow: 'hidden',
  },
  wrongText: { fontSize: 15, fontWeight: '600', color: AppColors.wrong },
  explainBlock: { marginTop: 12 },
  explainBtn: {
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: AppColors.accent,
    alignItems: 'center',
  },
  explainBtnText: { fontSize: 15, fontWeight: '600', color: AppColors.accent },
  explainText: {
    fontSize: 14,
    lineHeight: 22,
    color: AppColors.muted,
    padding: 14,
    borderRadius: Radii.md,
    borderWidth: 1,
    borderColor: AppColors.cardBorder,
    backgroundColor: AppColors.surfaceDeep,
  },
  resultsNavBtn: {
    marginTop: 8,
    paddingVertical: 16,
    borderRadius: Radii.lg,
    backgroundColor: AppColors.accent,
    alignItems: 'center',
    ...shadowCard,
  },
  resultsNavBtnText: { fontSize: 16, fontWeight: '700', color: AppColors.onAccent },
  resultsTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: AppColors.foreground,
    textAlign: 'center',
    marginBottom: 20,
  },
  resultCard: {
    borderRadius: Radii.xl,
    borderWidth: 1,
    borderColor: AppColors.cardBorder,
    backgroundColor: 'rgba(22, 26, 36, 0.92)',
    padding: 28,
    alignItems: 'center',
    marginBottom: 24,
    ...shadowCard,
  },
  resultLabel: { fontSize: 14, color: AppColors.muted },
  resultPct: { marginTop: 10, fontSize: 42, fontWeight: '800', color: AppColors.accent },
  resultSub: { marginTop: 8, fontSize: 15, color: AppColors.muted },
  rowGap: { flexDirection: 'row', gap: 12 },
  outlineBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: Radii.lg,
    borderWidth: 2,
    borderColor: AppColors.quizBorder,
    alignItems: 'center',
  },
  outlineBtnText: { fontSize: 15, fontWeight: '600', color: AppColors.accent },
  primaryBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: Radii.lg,
    backgroundColor: AppColors.accent,
    alignItems: 'center',
  },
  primaryBtnText: { fontSize: 15, fontWeight: '700', color: AppColors.onAccent },
});
