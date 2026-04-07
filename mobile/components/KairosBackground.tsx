import { LinearGradient } from 'expo-linear-gradient';
import type { ReactNode } from 'react';
import { StyleSheet, View, type ViewProps } from 'react-native';

import { AppColors } from '@/constants/theme';

type Props = ViewProps & { children: ReactNode };

/**
 * Web の body 背景に近い、ごく薄いセージ／ブルーの環境光グラデーション
 */
export function KairosBackground({ children, style, ...rest }: Props) {
  return (
    <View style={[styles.wrap, style]} {...rest}>
      <LinearGradient
        colors={[AppColors.background, AppColors.background]}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />
      <LinearGradient
        colors={['rgba(126,184,163,0.1)', 'transparent']}
        locations={[0, 1]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 0.52 }}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />
      <LinearGradient
        colors={['rgba(90,120,180,0.065)', 'transparent']}
        start={{ x: 1, y: 0 }}
        end={{ x: 0.2, y: 0.38 }}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />
      <LinearGradient
        colors={['transparent', 'rgba(126,184,163,0.055)']}
        start={{ x: 0, y: 0.65 }}
        end={{ x: 0.45, y: 1 }}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />
      <View style={styles.content}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1 },
  content: { flex: 1 },
});
