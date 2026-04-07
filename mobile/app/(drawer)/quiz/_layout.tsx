import { Stack } from 'expo-router';
import { StyleSheet } from 'react-native';

import { AppColors } from '@/constants/theme';

const headerStyle = {
  backgroundColor: AppColors.background,
  borderBottomWidth: StyleSheet.hairlineWidth,
  borderBottomColor: AppColors.hairline,
};

export default function QuizStackLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle,
        headerTintColor: AppColors.foreground,
        headerTitleStyle: { fontWeight: '600' as const, fontSize: 17 },
        headerShadowVisible: false,
        contentStyle: { backgroundColor: 'transparent' },
      }}
    >
      <Stack.Screen name="index" options={{ title: '問題集' }} />
      <Stack.Screen
        name="[chapterId]"
        options={{
          title: '解答',
          headerBackTitle: '戻る',
        }}
      />
    </Stack>
  );
}
