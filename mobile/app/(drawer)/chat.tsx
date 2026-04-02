import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { AppColors } from '@/constants/theme';

type ChatRole = 'user' | 'ai';
type ChatItem = { role: ChatRole; content: string };

const DEFAULT_API = 'http://localhost:8080/api/chat';

export default function ChatScreen() {
  const [message, setMessage] = useState('');
  const [chatLog, setChatLog] = useState<ChatItem[]>([]);
  const API_BASE = process.env.EXPO_PUBLIC_API_BASE_URL ?? DEFAULT_API;

  const sendMessage = async () => {
    if (!message.trim()) return;

    setChatLog((prev) => [...prev, { role: 'user', content: message.trim() }]);
    const currentMsg = message.trim();
    setMessage('');

    try {
      const res = await fetch(`${API_BASE}?message=${encodeURIComponent(currentMsg)}`);
      const data = await res.text();
      setChatLog((prev) => [...prev, { role: 'ai', content: data }]);
    } catch (err) {
      console.error(err);
      setChatLog((prev) => [
        ...prev,
        {
          role: 'ai',
          content:
            '接続できませんでした。API の URL（EXPO_PUBLIC_API_BASE_URL）と同一 Wi‑Fi を確認してください。',
        },
      ]);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
    >
      <FlatList
        data={chatLog}
        keyExtractor={(_, i) => i.toString()}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>なにか聞いてみてください</Text>
            <Text style={styles.emptySub}>送信ボタンまたはキーボードで送信</Text>
          </View>
        }
        renderItem={({ item }) => (
          <View
            style={[
              styles.msgRow,
              item.role === 'user' ? styles.msgRowUser : styles.msgRowAi,
            ]}
          >
            <View style={[styles.bubble, item.role === 'user' ? styles.bubbleUser : styles.bubbleAi]}>
              <Text style={styles.msgText}>{item.content}</Text>
            </View>
          </View>
        )}
      />

      <View style={styles.inputArea}>
        <TextInput
          style={styles.input}
          value={message}
          onChangeText={setMessage}
          placeholder="メッセージを入力…"
          placeholderTextColor={AppColors.muted}
          multiline
          maxLength={8000}
        />
        <TouchableOpacity
          style={[styles.sendBtn, !message.trim() && styles.sendBtnDisabled]}
          onPress={sendMessage}
          disabled={!message.trim()}
          activeOpacity={0.85}
        >
          <Text style={[styles.sendBtnText, !message.trim() && styles.sendBtnTextDisabled]}>送信</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: AppColors.background,
  },
  listContent: {
    paddingHorizontal: 4,
    paddingVertical: 16,
    flexGrow: 1,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    opacity: 0.45,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: AppColors.foreground,
  },
  emptySub: {
    marginTop: 6,
    fontSize: 13,
    color: AppColors.muted,
  },
  msgRow: {
    marginBottom: 10,
    flexDirection: 'row',
  },
  msgRowUser: {
    justifyContent: 'flex-end',
  },
  msgRowAi: {
    justifyContent: 'flex-start',
  },
  bubble: {
    maxWidth: '86%',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 16,
    borderWidth: 1,
  },
  bubbleUser: {
    backgroundColor: AppColors.bubbleUser,
    borderColor: AppColors.bubbleUserBorder,
    borderBottomRightRadius: 4,
  },
  bubbleAi: {
    backgroundColor: AppColors.bubbleAi,
    borderColor: AppColors.border,
    borderBottomLeftRadius: 4,
  },
  msgText: {
    fontSize: 15,
    lineHeight: 22,
    color: AppColors.foreground,
  },
  inputArea: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
    paddingHorizontal: 4,
    paddingTop: 10,
    paddingBottom: Platform.OS === 'ios' ? 24 : 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: AppColors.border,
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    backgroundColor: AppColors.inputBg,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: AppColors.border,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    color: AppColors.foreground,
  },
  sendBtn: {
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: AppColors.accent,
    shadowColor: AppColors.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 4,
  },
  sendBtnDisabled: {
    backgroundColor: AppColors.surfaceElevated,
    shadowOpacity: 0,
    elevation: 0,
  },
  sendBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0a0c0e',
  },
  sendBtnTextDisabled: {
    color: AppColors.muted,
  },
});
