import React from 'react';
import { Link } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { KairosBackground } from '@/components/KairosBackground';
import { AppColors, Radii, shadowAccent, shadowCard } from '@/constants/theme';

export default function HomeScreen() {
  const insets = useSafeAreaInsets();

  return (
    <KairosBackground>
      <View
        style={[
          styles.root,
          {
            paddingTop: Math.max(insets.top, 10),
            paddingBottom: insets.bottom + 28,
          },
        ]}
      >
        <View style={styles.hero}>
          <View style={styles.logoMark}>
            <Text style={styles.logoGlyph}>✦</Text>
          </View>
          <Text style={styles.kicker}>KAIROS</Text>
          <Text style={styles.title}>おかえりなさい</Text>
          <Text style={styles.lead}>
            Web と同じトーンの問題集とチャット。落ち着いたダーク UI で長く使えます。
          </Text>
        </View>
        <View style={styles.heroRule} />

        <Link href="/quiz" asChild>
          <Pressable style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}>
            <View style={styles.cardIcon}>
              <Text style={styles.cardIconText}>📚</Text>
            </View>
            <Text style={styles.cardTitle}>問題集</Text>
            <Text style={styles.cardDesc}>大分類・チャプターを選んでクイズに挑戦</Text>
            <Text style={styles.cardCta}>開く →</Text>
          </Pressable>
        </Link>

        <Link href="/chat" asChild>
          <Pressable style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}>
            <View style={styles.cardIcon}>
              <Text style={styles.cardIconText}>💬</Text>
            </View>
            <Text style={styles.cardTitle}>チャット</Text>
            <Text style={styles.cardDesc}>AI アシスタントと会話を始める</Text>
            <Text style={styles.cardCta}>開く →</Text>
          </Pressable>
        </Link>

        <View style={styles.hintCard}>
          <Text style={styles.hintTitle}>接続のヒント</Text>
          <Text style={styles.hintDesc}>
            実機から API に繋ぐときは .env の EXPO_PUBLIC_API_BASE_URL に PC の LAN IP を指定してください（例:
            http://192.168.1.10:8080）。
          </Text>
        </View>
      </View>
    </KairosBackground>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    paddingHorizontal: 22,
  },
  hero: {
    marginBottom: 18,
  },
  logoMark: {
    width: 52,
    height: 52,
    borderRadius: Radii.lg,
    backgroundColor: AppColors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
    ...shadowAccent,
  },
  logoGlyph: {
    fontSize: 24,
    color: AppColors.onAccent,
    fontWeight: '700',
  },
  kicker: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 3,
    color: AppColors.accentSoft,
    marginBottom: 10,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: AppColors.foreground,
    letterSpacing: -0.6,
  },
  lead: {
    marginTop: 12,
    fontSize: 15,
    lineHeight: 24,
    color: AppColors.muted,
  },
  heroRule: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: AppColors.sidebarBorder,
    marginBottom: 22,
  },
  card: {
    borderRadius: Radii.xl,
    borderWidth: 1,
    borderColor: AppColors.cardBorder,
    backgroundColor: 'rgba(22, 26, 36, 0.88)',
    padding: 22,
    marginBottom: 14,
    ...shadowCard,
  },
  cardPressed: {
    opacity: 0.94,
    transform: [{ scale: 0.992 }],
  },
  cardIcon: {
    width: 44,
    height: 44,
    borderRadius: Radii.md,
    backgroundColor: AppColors.accentMuted,
    borderWidth: 1,
    borderColor: AppColors.quizBorder,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  cardIconText: {
    fontSize: 22,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: AppColors.foreground,
    letterSpacing: -0.3,
  },
  cardDesc: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 21,
    color: AppColors.muted,
  },
  cardCta: {
    marginTop: 18,
    fontSize: 14,
    fontWeight: '700',
    color: AppColors.accent,
    letterSpacing: 0.2,
  },
  hintCard: {
    marginTop: 8,
    borderRadius: Radii.xl,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: 'rgba(255,255,255,0.09)',
    backgroundColor: 'rgba(15, 18, 24, 0.55)',
    padding: 20,
  },
  hintTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: AppColors.muted2,
    marginBottom: 10,
    letterSpacing: 0.5,
  },
  hintDesc: {
    fontSize: 14,
    lineHeight: 22,
    color: AppColors.muted,
  },
});
