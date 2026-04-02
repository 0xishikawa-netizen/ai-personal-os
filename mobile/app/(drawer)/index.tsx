import React from 'react';
import { StyleSheet, Text, View, Pressable } from 'react-native';
import { Link } from 'expo-router';
import { AppColors } from '@/constants/theme';

export default function HomeScreen() {
  return (
    <View style={styles.root}>
      <View style={styles.hero}>
        <View style={styles.logoMark}>
          <Text style={styles.logoGlyph}>✦</Text>
        </View>
        <Text style={styles.kicker}>HOME</Text>
        <Text style={styles.title}>おかえりなさい</Text>
        <Text style={styles.lead}>
          チャットで AI と会話したり、今後ここにウィジェットを並べていけます。
        </Text>
      </View>

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

      <View style={styles.placeholder}>
        <Text style={styles.placeholderTitle}>今後の機能</Text>
        <Text style={styles.placeholderDesc}>タスク・メモなど、ここにショートカットを追加予定です。</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: AppColors.background,
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 24,
  },
  hero: {
    marginBottom: 24,
  },
  logoMark: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: AppColors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    shadowColor: AppColors.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 6,
  },
  logoGlyph: {
    fontSize: 22,
    color: '#0a0c0e',
    fontWeight: '700',
  },
  kicker: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 2,
    color: AppColors.accent,
    marginBottom: 8,
  },
  title: {
    fontSize: 26,
    fontWeight: '600',
    color: AppColors.foreground,
    letterSpacing: -0.5,
  },
  lead: {
    marginTop: 10,
    fontSize: 15,
    lineHeight: 22,
    color: AppColors.muted,
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: AppColors.border,
    backgroundColor: AppColors.surfaceElevated,
    padding: 20,
    marginBottom: 16,
  },
  cardPressed: {
    opacity: 0.92,
    transform: [{ scale: 0.99 }],
  },
  cardIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(126, 184, 163, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  cardIconText: {
    fontSize: 20,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: AppColors.foreground,
  },
  cardDesc: {
    marginTop: 6,
    fontSize: 14,
    lineHeight: 20,
    color: AppColors.muted,
  },
  cardCta: {
    marginTop: 16,
    fontSize: 14,
    fontWeight: '600',
    color: AppColors.accent,
  },
  placeholder: {
    borderRadius: 16,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: AppColors.border,
    backgroundColor: 'rgba(15, 18, 24, 0.5)',
    padding: 20,
  },
  placeholderTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: AppColors.muted,
    marginBottom: 8,
  },
  placeholderDesc: {
    fontSize: 14,
    lineHeight: 20,
    color: AppColors.muted,
    opacity: 0.9,
  },
});
