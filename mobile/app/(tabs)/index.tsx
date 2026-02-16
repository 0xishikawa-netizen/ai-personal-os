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

type ChatRole = 'user' | 'ai';
type ChatItem = { role: ChatRole; content: string };

export default function ChatScreen() {
  const [message, setMessage] = useState('');
  const [chatLog, setChatLog] = useState<ChatItem[]>([]);
  const BACKEND_URL = 'http://192.168.100.21:8080/api/chat';

  const sendMessage = async () => {
    if (!message) return;

    setChatLog((prev) => [...prev, { role: 'user', content: message }]);
    const currentMsg = message;
    setMessage('');

    try {
      const res = await fetch(`${BACKEND_URL}?message=${encodeURIComponent(currentMsg)}`);
      const data = await res.text();
      setChatLog((prev) => [...prev, { role: 'ai', content: data }]);
    } catch (err) {
      console.error(err);
      setChatLog((prev) => [
        ...prev,
        { role: 'ai', content: 'エラー: Macとスマホが同じWi-Fiか確認してください' },
      ]);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <View style={styles.header}>
        <Text style={styles.title}>AI OS Mobile</Text>
      </View>

      <FlatList
        data={chatLog}
        keyExtractor={(_, i) => i.toString()}
        renderItem={({ item }) => (
          <View style={[styles.msg, item.role === 'user' ? styles.user : styles.ai]}>
            <Text style={item.role === 'user' ? styles.uText : styles.aText}>{item.content}</Text>
          </View>
        )}
        contentContainerStyle={{ padding: 20 }}
      />

      <View style={styles.inputArea}>
        <TextInput
          style={styles.input}
          value={message}
          onChangeText={setMessage}
          placeholder="AIに命令..."
        />
        <TouchableOpacity style={styles.btn} onPress={sendMessage}>
          <Text style={styles.btnText}>送信</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: {
    paddingTop: 60,
    paddingBottom: 20,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  title: { fontSize: 18, fontWeight: 'bold', color: '#007AFF' },
  msg: { padding: 12, borderRadius: 15, marginBottom: 10, maxWidth: '80%' },
  user: { alignSelf: 'flex-end', backgroundColor: '#007AFF' },
  ai: { alignSelf: 'flex-start', backgroundColor: '#f0f0f0' },
  uText: { color: '#fff' },
  aText: { color: '#333' },
  inputArea: {
    flexDirection: 'row',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    marginBottom: 20,
  },
  input: {
    flex: 1,
    backgroundColor: '#f8f8f8',
    borderRadius: 20,
    paddingHorizontal: 15,
    height: 40,
  },
  btn: {
    marginLeft: 10,
    backgroundColor: '#007AFF',
    borderRadius: 20,
    paddingHorizontal: 20,
    justifyContent: 'center',
  },
  btnText: { color: '#fff' },
});
