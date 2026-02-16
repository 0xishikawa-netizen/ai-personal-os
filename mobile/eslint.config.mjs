import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import reactNative from 'eslint-plugin-react-native';
import prettier from 'eslint-config-prettier';

export default [
  // 対象外（lintしない）
  {
    ignores: [
      'node_modules/**',
      'dist/**',
      'build/**',
      'coverage/**',
      '.expo/**',
      'ios/**',
      'android/**',
      'components/__tests__/**',
    ],
  },

  // JS/TS 推奨
  js.configs.recommended,
  ...tseslint.configs.recommended,

  // React / RN
  {
    files: ['**/*.{js,jsx,ts,tsx}'],
    plugins: {
      react,
      'react-hooks': reactHooks,
      'react-native': reactNative,
    },
    settings: {
      react: { version: 'detect' },
    },
    rules: {
      // React 17+ / RN では不要
      'react/react-in-jsx-scope': 'off',

      // Hooks
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',

      // Expo/RNでは require() を使うことがあるので許容
      '@typescript-eslint/no-require-imports': 'off',

      // RN: 好みで ON/OFF
      'react-native/no-inline-styles': 'off',
    },
  },

  // Prettier と競合する整形ルールを無効化
  prettier,
];
