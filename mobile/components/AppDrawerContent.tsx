import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  Pressable,
  Alert,
} from 'react-native';
import { DrawerContentScrollView, DrawerContentComponentProps } from '@react-navigation/drawer';
import { router, usePathname } from 'expo-router';
import { AppColors } from '@/constants/theme';

export function AppDrawerContent(props: DrawerContentComponentProps) {
  const { navigation } = props;
  const pathname = usePathname();
  const isChat = pathname === '/chat' || pathname.endsWith('/chat');
  const isHome = !isChat;

  const close = () => navigation.closeDrawer();

  const goHome = () => {
    router.push('/');
    close();
  };

  const goChat = () => {
    router.push('/chat');
    close();
  };

  const logout = () => {
    close();
    Alert.alert('ログアウト', 'モバイルアプリではセッションは端末内のみです。Web と同じログイン連携は今後の予定です。');
  };

  return (
    <DrawerContentScrollView
      {...props}
      contentContainerStyle={styles.scroll}
      style={styles.drawer}
    >
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
          <Text style={[styles.navIcon]}>⌂</Text>
          <Text style={[styles.navLabel, isHome && styles.navLabelActive]}>ホーム</Text>
        </Pressable>
        <Pressable
          onPress={goChat}
          style={({ pressed }) => [styles.navItem, isChat && styles.navItemActive, pressed && styles.pressed]}
        >
          <Text style={[styles.navIcon]}>💬</Text>
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
    paddingTop: 8,
    paddingBottom: 24,
  },
  brand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: AppColors.sidebarBorder,
    marginBottom: 8,
  },
  logoMark: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: AppColors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: AppColors.accent,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 4,
  },
  logoGlyph: {
    fontSize: 18,
    color: '#0a0c0e',
    fontWeight: '700',
  },
  brandTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: AppColors.foreground,
  },
  brandSub: {
    fontSize: 11,
    color: AppColors.muted,
    marginTop: 2,
  },
  nav: {
    paddingHorizontal: 8,
    gap: 4,
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  navItemActive: {
    backgroundColor: AppColors.accentMuted,
  },
  pressed: {
    opacity: 0.85,
  },
  navIcon: {
    fontSize: 16,
    width: 22,
    textAlign: 'center',
  },
  navLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: AppColors.foreground,
  },
  navLabelActive: {
    color: AppColors.accent,
    fontWeight: '600',
  },
  footer: {
    marginTop: 'auto',
    paddingHorizontal: 16,
    paddingTop: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: AppColors.sidebarBorder,
  },
  logout: {
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  logoutText: {
    fontSize: 14,
    color: AppColors.muted,
  },
});
