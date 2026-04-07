import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { KairosBackground } from '@/components/KairosBackground';
import { AppColors, Radii, shadowCard } from '@/constants/theme';
import {
  getChaptersBySection,
  getQuizUserId,
  getStats,
  loadStore,
  questionCountForChapter,
} from '@/lib/quiz';
import type { QuizChapter, QuizStats, QuizStore } from '@/lib/quiz/types';

export default function QuizHomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [store, setStore] = useState<QuizStore | null>(null);
  const [stats, setStats] = useState<QuizStats | null>(null);
  const [sectionId, setSectionId] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const refresh = useCallback(async () => {
    setErr(null);
    try {
      const s = await loadStore();
      setStore(s);
      const uid = await getQuizUserId();
      const st = await getStats(uid);
      setStats(st);
      setSectionId((prev) => {
        if (prev && s.sections.some((x) => x.id === prev)) return prev;
        const sorted = s.sections.slice().sort((a, b) => a.order - b.order);
        return sorted[0]?.id ?? null;
      });
    } catch {
      setStore(null);
      setErr('データを読み込めませんでした。API の URL とサーバー起動を確認してください。');
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refresh();
    } finally {
      setRefreshing(false);
    }
  }, [refresh]);

  const sections = useMemo(
    () => store?.sections.slice().sort((a, b) => a.order - b.order) ?? [],
    [store],
  );
  const activeSectionId = sectionId ?? sections[0]?.id ?? '';
  const chapters: QuizChapter[] = useMemo(() => {
    if (!store || !activeSectionId) return [];
    return getChaptersBySection(store, activeSectionId);
  }, [store, activeSectionId]);

  const weakSet = useMemo(
    () => new Set(stats?.weakChapters.map((w) => w.chapterId) ?? []),
    [stats],
  );

  if (!store && !err) {
    return (
      <KairosBackground>
        <View style={[styles.center, { paddingBottom: insets.bottom }]}>
          <ActivityIndicator size="large" color={AppColors.accent} />
          <Text style={styles.muted}>読み込み中…</Text>
        </View>
      </KairosBackground>
    );
  }

  if (!store && err) {
    return (
      <KairosBackground>
        <View style={[styles.center, styles.padH, { paddingBottom: insets.bottom }]}>
          <Text style={styles.errorText}>{err}</Text>
          <Pressable style={styles.retryBtn} onPress={() => void refresh()}>
            <Text style={styles.retryBtnText}>再試行</Text>
          </Pressable>
        </View>
      </KairosBackground>
    );
  }

  if (!store) return null;

  const acc = stats ? Math.round(stats.accuracyPercent) : 0;

  return (
    <KairosBackground>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 28, paddingTop: 10 },
        ]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={AppColors.accent} />
        }
      >
        <View style={styles.headerBlock}>
          <Text style={styles.kicker}>KAIROS QUIZ</Text>
          <Text style={styles.title}>問題集</Text>
          <Text style={styles.lead}>Web と同じ API・同じトーンで学習できます。</Text>
        </View>
        <View style={styles.headerRule} />

        <View style={styles.statGrid}>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>総問題数</Text>
            <Text style={styles.statValue}>{stats?.totalQuestions ?? '—'}</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>回答数</Text>
            <Text style={styles.statValue}>{stats?.answerCount ?? '—'}</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>正答率</Text>
            <Text style={styles.statValue}>{stats ? `${acc}%` : '—'}</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>連続日</Text>
            <Text style={styles.statValue}>{stats?.streakDays ?? '—'}</Text>
          </View>
        </View>

        <Text style={styles.sectionHeading}>大分類</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.pillRow}
          style={styles.pillScroll}
        >
          {sections.map((s) => {
            const active = s.id === activeSectionId;
            return (
              <Pressable
                key={s.id}
                onPress={() => setSectionId(s.id)}
                style={[styles.pill, active && styles.pillActive]}
              >
                <Text style={[styles.pillText, active && styles.pillTextActive]}>{s.name}</Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <Text style={styles.sectionHeading}>チャプター</Text>
        {chapters.length === 0 ? (
          <Text style={styles.muted}>この大分類にチャプターがありません。</Text>
        ) : (
          chapters.map((c) => {
            const n = questionCountForChapter(store, c.id);
            const weak = weakSet.has(c.id);
            return (
              <Pressable
                key={c.id}
                style={({ pressed }) => [styles.chapterRow, pressed && styles.pressed]}
                onPress={() => router.push(`/quiz/${c.id}`)}
              >
                <View style={styles.chapterTextWrap}>
                  <View style={styles.chapterTitleRow}>
                    <Text style={styles.chapterTitle}>{c.title}</Text>
                    {weak ? (
                      <View style={styles.weakBadge}>
                        <Text style={styles.weakBadgeText}>弱点</Text>
                      </View>
                    ) : null}
                  </View>
                  <Text style={styles.chapterMeta}>{n} 問</Text>
                </View>
                <Text style={styles.chapterCta}>›</Text>
              </Pressable>
            );
          })
        )}
      </ScrollView>
    </KairosBackground>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: 'transparent' },
  scrollContent: { paddingHorizontal: 22 },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
  },
  padH: { paddingHorizontal: 28 },
  muted: { fontSize: 14, color: AppColors.muted },
  errorText: {
    fontSize: 15,
    color: AppColors.muted,
    textAlign: 'center',
    lineHeight: 24,
  },
  retryBtn: {
    marginTop: 10,
    paddingHorizontal: 22,
    paddingVertical: 14,
    borderRadius: Radii.md,
    borderWidth: 1,
    borderColor: AppColors.quizBorder,
    backgroundColor: AppColors.accentMuted,
  },
  retryBtnText: { fontSize: 15, fontWeight: '700', color: AppColors.accent },
  headerBlock: { marginBottom: 14 },
  headerRule: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: AppColors.sidebarBorder,
    marginBottom: 22,
  },
  kicker: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 2.5,
    color: AppColors.accentSoft,
    marginBottom: 10,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: AppColors.foreground,
    letterSpacing: -0.6,
  },
  lead: { marginTop: 12, fontSize: 15, lineHeight: 24, color: AppColors.muted },
  statGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 26 },
  statCard: {
    width: '47%',
    borderRadius: Radii.lg,
    borderWidth: 1,
    borderColor: AppColors.cardBorder,
    backgroundColor: 'rgba(22, 26, 36, 0.88)',
    padding: 16,
    ...shadowCard,
  },
  statLabel: { fontSize: 12, fontWeight: '500', color: AppColors.muted },
  statValue: { marginTop: 8, fontSize: 24, fontWeight: '800', color: AppColors.accent, letterSpacing: -0.5 },
  sectionHeading: {
    fontSize: 13,
    fontWeight: '700',
    color: AppColors.foreground,
    marginBottom: 12,
    letterSpacing: 0.2,
  },
  pillScroll: { marginBottom: 22, marginHorizontal: -4 },
  pillRow: { flexDirection: 'row', gap: 8, paddingVertical: 4 },
  pill: {
    paddingHorizontal: 16,
    paddingVertical: 11,
    borderRadius: Radii.md,
    borderWidth: 1,
    borderColor: AppColors.cardBorder,
    backgroundColor: 'rgba(22, 26, 36, 0.75)',
  },
  pillActive: {
    borderColor: AppColors.quizBorder,
    backgroundColor: AppColors.accentMuted,
  },
  pillText: { fontSize: 14, fontWeight: '500', color: AppColors.muted },
  pillTextActive: { color: AppColors.accent, fontWeight: '700' },
  chapterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 18,
    marginBottom: 11,
    borderRadius: Radii.lg,
    borderWidth: 1,
    borderColor: AppColors.cardBorder,
    backgroundColor: 'rgba(22, 26, 36, 0.88)',
    ...shadowCard,
  },
  pressed: { opacity: 0.93 },
  chapterTextWrap: { flex: 1 },
  chapterTitleRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 },
  chapterTitle: { fontSize: 16, fontWeight: '700', color: AppColors.foreground, letterSpacing: -0.2 },
  weakBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: AppColors.wrongMuted,
    borderWidth: 1,
    borderColor: 'rgba(229, 152, 155, 0.35)',
  },
  weakBadgeText: { fontSize: 11, fontWeight: '700', color: AppColors.wrong },
  chapterMeta: { marginTop: 6, fontSize: 13, color: AppColors.muted },
  chapterCta: { fontSize: 24, color: AppColors.accent, fontWeight: '200', marginLeft: 8 },
});
