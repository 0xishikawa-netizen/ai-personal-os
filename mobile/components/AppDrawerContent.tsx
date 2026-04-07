import React from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { DrawerContentScrollView, type DrawerContentComponentProps } from '@react-navigation/drawer';
import { router, usePathname } from 'expo-router';

import { AppColors, Radii, shadowAccent } from '@/constants/theme';

export function AppDrawerContent(props: DrawerContentComponentProps) {
  const { navigation } = props;
  const pathname = usePathname();
  const isChat = pathname === '/chat' || pathname.endsWith('/chat');
  const isQuiz = pathname === '/quiz' || pathname.startsWith('/quiz/');
  const isHome = !isChat && !isQuiz;

  const close = () => navigation.closeDrawer();

  const goHome = () => {
    router.push('/');
    close();
  };

  const goChat = () => {
    router.push('/chat');
    close();
  };

  const goQuiz = () => {
    router.push('/quiz');
    close();
  };

  const logout = () => {
    close();
    Alert.alert(
      'ログアウト',
      'モバイルアプリではセッションは端末内のみです。Web と同じログイン連携は今後の予定です。',
    );
  };

  return (
    <DrawerContentScrollView {...props} contentContainerStyle={styles.scroll} style={styles.drawer}>
      <View style={styles.brand}>
        <View style={styles.logoMark}>
          <Text style={styles.logoGlyph}>✦</Text>
        </View>
        <View>
          <Text style={styles.brandTitle}>Kairos</Text>
          <Text style={styles.brandSub}>コントロールセンター</Text>
        </View>
      </View>

      <View style={styles.nav}>
        <Pressable
          onPress={goHome}
          style={({ pressed }) => [styles.navItem, isHome && styles.navItemActive, pressed && styles.pressed]}
        >
          <Text style={styles.navIcon}>⌂</Text>
          <Text style={[styles.navLabel, isHome && styles.navLabelActive]}>ホーム</Text>
        </Pressable>
        <Pressable
          onPress={goQuiz}
          style={({ pressed }) => [styles.navItem, isQuiz && styles.navItemActive, pressed && styles.pressed]}
        >
          <Text style={styles.navIcon}>📚</Text>
          <Text style={[styles.navLabel, isQuiz && styles.navLabelActive]}>問題集</Text>
        </Pressable>
        <Pressable
          onPress={goChat}
          style={({ pressed }) => [styles.navItem, isChat && styles.navItemActive, pressed && styles.pressed]}
        >
          <Text style={styles.navIcon}>💬</Text>
          <Text style={[styles.navLabel, isChat && styles.navLabelActive]}>チャット</Text>
        </Pressable>
      </View>

      <View style={styles.footer}>
        <Pressable onPress={logout} style={({ pressed }) => [styles.logout, pressed && styles.pressed]}>
          <Text style={styles.logoutText}>ログアウト</Text>
        </Pressable>
      </View>
    </DrawerContentScrollView>
  );
}

const styles = StyleSheet.create({
  drawer: {
    flex: 1,
    backgroundColor: AppColors.sidebar,
  },
  scroll: {
    flexGrow: 1,
    paddingTop: 12,
    paddingBottom: 28,
  },
  brand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 18,
    paddingVertical: 18,
    marginHorizontal: 10,
    marginBottom: 12,
    borderRadius: Radii.lg,
    borderWidth: 1,
    borderColor: AppColors.hairline,
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  logoMark: {
    width: 40,
    height: 40,
    borderRadius: Radii.md,
    backgroundColor: AppColors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadowAccent,
  },
  logoGlyph: {
    fontSize: 20,
    color: AppColors.onAccent,
    fontWeight: '700',
  },
  brandTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: AppColors.foreground,
    letterSpacing: -0.2,
  },
  brandSub: {
    fontSize: 12,
    color: AppColors.muted,
    marginTop: 3,
  },
  nav: {
    paddingHorizontal: 10,
    gap: 6,
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: Radii.md,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  navItemActive: {
    backgroundColor: AppColors.accentMuted,
    borderColor: AppColors.quizBorder,
  },
  pressed: {
    opacity: 0.88,
  },
  navIcon: {
    fontSize: 17,
    width: 26,
    textAlign: 'center',
  },
  navLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: AppColors.foreground,
  },
  navLabelActive: {
    color: AppColors.accent,
    fontWeight: '700',
  },
  footer: {
    marginTop: 'auto',
    paddingHorizontal: 18,
    paddingTop: 20,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: AppColors.sidebarBorder,
  },
  logout: {
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: Radii.md,
  },
  logoutText: {
    fontSize: 14,
    color: AppColors.muted2,
  },
});
