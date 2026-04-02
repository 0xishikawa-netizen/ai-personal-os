import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Drawer } from 'expo-router/drawer';
import { DrawerContentComponentProps, DrawerToggleButton } from '@react-navigation/drawer';

import { AppDrawerContent } from '@/components/AppDrawerContent';
import { AppColors } from '@/constants/theme';

const screenOptions = {
  headerStyle: {
    backgroundColor: AppColors.background,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  headerTintColor: AppColors.foreground,
  headerTitleStyle: { fontWeight: '600' as const, fontSize: 17 },
  headerLeft: (props: { tintColor?: string }) => (
    <DrawerToggleButton {...props} tintColor={AppColors.foreground} />
  ),
  drawerStyle: {
    width: 280,
    backgroundColor: AppColors.sidebar,
  },
  drawerType: 'slide' as const,
  overlayColor: 'rgba(0,0,0,0.55)',
  swipeEnabled: true,
};

export default function DrawerLayout() {
  return (
    <Drawer
      drawerContent={(p: DrawerContentComponentProps) => <AppDrawerContent {...p} />}
      screenOptions={screenOptions}
    >
      <Drawer.Screen
        name="index"
        options={{
          title: 'ホーム',
          drawerLabel: 'ホーム',
        }}
      />
      <Drawer.Screen
        name="chat"
        options={{
          title: 'チャット',
          drawerLabel: 'チャット',
          headerTitle: () => (
            <View style={{ justifyContent: 'center' }}>
              <Text style={{ fontSize: 17, fontWeight: '600', color: AppColors.foreground }}>チャット</Text>
              <Text style={{ fontSize: 12, color: AppColors.muted, marginTop: 2 }}>AI アシスタントと会話</Text>
            </View>
          ),
        }}
      />
    </Drawer>
  );
}
