import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { KairosBackground } from '@/components/KairosBackground';
import { AppColors, Radii, shadowAccent } from '@/constants/theme';
import { getApiOrigin } from '@/lib/apiOrigin';

type ChatRole = 'user' | 'ai';
type ChatItem = { role: ChatRole; content: string };

function chatUrl(): string {
  return `${getApiOrigin()}/api/chat`;
}

export default function ChatScreen() {
  const [message, setMessage] = useState('');
  const [chatLog, setChatLog] = useState<ChatItem[]>([]);
  const [sending, setSending] = useState(false);
  const listRef = useRef<FlatList<ChatItem>>(null);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (chatLog.length === 0) return;
    const t = requestAnimationFrame(() => {
      listRef.current?.scrollToEnd({ animated: true });
    });
    return () => cancelAnimationFrame(t);
  }, [chatLog.length]);

  const sendMessage = async () => {
    if (!message.trim() || sending) return;

    const currentMsg = message.trim();
    setChatLog((prev) => [...prev, { role: 'user', content: currentMsg }]);
    setMessage('');
    setSending(true);

    try {
      const res = await fetch(`${chatUrl()}?message=${encodeURIComponent(currentMsg)}`);
      const data = await res.text();
      if (!res.ok) {
        setChatLog((prev) => [
          ...prev,
          { role: 'ai', content: `リクエストに失敗しました（HTTP ${res.status}）。${data.slice(0, 200)}` },
        ]);
        return;
      }
      setChatLog((prev) => [...prev, { role: 'ai', content: data }]);
    } catch (err) {
      console.error(err);
      setChatLog((prev) => [
        ...prev,
        {
          role: 'ai',
          content:
            '接続できませんでした。EXPO_PUBLIC_API_BASE_URL（例: http://192.168.x.x:8080）と同一 Wi‑Fi を確認してください。',
        },
      ]);
    } finally {
      setSending(false);
    }
  };

  const canSend = message.trim().length > 0 && !sending;

  return (
    <KairosBackground>
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.container}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
    >
      <FlatList
        ref={listRef}
        data={chatLog}
        keyExtractor={(_, i) => i.toString()}
        contentContainerStyle={styles.listContent}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>なにか聞いてみてください</Text>
            <Text style={styles.emptySub}>送信ボタンでメッセージを送れます</Text>
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

      <View
        style={[
          styles.inputArea,
          { paddingBottom: Math.max(insets.bottom, 10) },
        ]}
      >
        <TextInput
          style={styles.input}
          value={message}
          onChangeText={setMessage}
          placeholder="メッセージを入力…"
          placeholderTextColor={AppColors.muted}
          multiline
          maxLength={8000}
          editable={!sending}
          onSubmitEditing={() => void sendMessage()}
          blurOnSubmit={false}
        />
        <TouchableOpacity
          style={[styles.sendBtn, !canSend && styles.sendBtnDisabled]}
          onPress={() => void sendMessage()}
          disabled={!canSend}
          activeOpacity={0.85}
        >
          {sending ? (
            <ActivityIndicator color={AppColors.onAccent} size="small" />
          ) : (
            <Text style={[styles.sendBtnText, !canSend && styles.sendBtnTextDisabled]}>送信</Text>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
    </KairosBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingVertical: 18,
    flexGrow: 1,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    opacity: 0.5,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: AppColors.foreground,
    letterSpacing: -0.2,
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
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: Radii.lg,
    borderWidth: 1,
  },
  bubbleUser: {
    backgroundColor: AppColors.bubbleUser,
    borderColor: AppColors.bubbleUserBorder,
    borderBottomRightRadius: 4,
  },
  bubbleAi: {
    backgroundColor: AppColors.bubbleAi,
    borderColor: AppColors.cardBorder,
    borderBottomLeftRadius: 4,
  },
  msgText: {
    fontSize: 15,
    lineHeight: 23,
    color: AppColors.foreground,
  },
  inputArea: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
    paddingHorizontal: 14,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: AppColors.sidebarBorder,
    backgroundColor: 'rgba(8, 10, 14, 0.65)',
  },
  input: {
    flex: 1,
    minHeight: 46,
    maxHeight: 120,
    backgroundColor: AppColors.choiceBg,
    borderRadius: Radii.md,
    borderWidth: 1,
    borderColor: AppColors.cardBorder,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    color: AppColors.foreground,
  },
  sendBtn: {
    minWidth: 76,
    height: 46,
    paddingHorizontal: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: Radii.md,
    backgroundColor: AppColors.accent,
    ...shadowAccent,
  },
  sendBtnDisabled: {
    backgroundColor: AppColors.surfaceElevated,
    shadowOpacity: 0,
    elevation: 0,
  },
  sendBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: AppColors.onAccent,
  },
  sendBtnTextDisabled: {
    color: AppColors.muted,
  },
});
