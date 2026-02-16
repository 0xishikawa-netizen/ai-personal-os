'use client';
import { useState, useEffect } from 'react';

export default function Home() {
  const [message, setMessage] = useState('');
  const [chatLog, setChatLog] = useState<{ role: string; content: string }[]>([]);

  // 起動時にDBから過去の全履歴を読み込む（同期）
  useEffect(() => {
    fetch('http://localhost:8080/api/chat/history')
      .then((res) => res.json())
      .then((data) => setChatLog(data))
      .catch((err) => console.error('履歴の取得に失敗しました', err));
  }, []);

  const sendMessage = async () => {
    if (!message) return;
    setChatLog((prev) => [...prev, { role: 'user', content: message }]);
    const currentMsg = message;
    setMessage('');

    const res = await fetch(
      `http://localhost:8080/api/chat?message=${encodeURIComponent(currentMsg)}`,
    );
    const data = await res.text();
    setChatLog((prev) => [...prev, { role: 'ai', content: data }]);
  };

  return (
    <main className="p-10 max-w-4xl mx-auto min-h-screen bg-gray-50">
      <h1 className="text-3xl font-bold mb-8 text-blue-600">AI Personal OS - Dashboard</h1>
      <div className="bg-white rounded-xl shadow-sm border p-6 h-[600px] overflow-y-auto mb-6">
        {chatLog.map((log, i) => (
          <div
            key={i}
            className={`mb-4 flex ${log.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`p-3 rounded-lg ${log.role === 'user' ? 'bg-blue-500 text-white' : 'bg-gray-100 text-black'}`}
            >
              {log.content}
            </div>
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          className="flex-1 border p-3 rounded-lg text-black"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="PCから入力..."
        />
        <button className="bg-blue-600 text-white px-8 py-3 rounded-lg" onClick={sendMessage}>
          送信
        </button>
      </div>
    </main>
  );
}
