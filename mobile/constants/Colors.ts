import { AppColors } from './theme';

const tint = AppColors.accent;

export default {
  light: {
    text: AppColors.foreground,
    background: AppColors.background,
    tint,
    tabIconDefault: AppColors.muted,
    tabIconSelected: tint,
  },
  dark: {
    text: AppColors.foreground,
    background: AppColors.background,
    tint,
    tabIconDefault: AppColors.muted,
    tabIconSelected: tint,
  },
};
