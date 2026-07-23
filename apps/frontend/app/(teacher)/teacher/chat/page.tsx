'use client';

import { useState, useEffect, useRef } from 'react';
import { api } from '@/app/lib/api';

interface Message {
  id: string;
  fromId: string;
  content: string;
  createdAt: string;
}

interface Contact {
  userId: string;
  unread: number;
}

export default function TeacherChatPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [selected, setSelected] = useState<string>('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [myId, setMyId] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api.get<{ id: string }>('/auth/me').then(({ data }) => setMyId(data.id));
    api.get<Contact[]>('/messages/contacts').then(({ data }) => setContacts(data));
  }, []);

  useEffect(() => {
    if (!selected) return;
    api.get<Message[]>(`/messages/conversation/${selected}`).then(({ data }) => {
      setMessages(data);
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
    });
    api.post(`/messages/read/${selected}`).catch(() => {});
  }, [selected]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim() || !selected) return;
    setSending(true);
    try {
      const { data } = await api.post<Message>('/messages', { toId: selected, content: text });
      setMessages((prev) => [...prev, data]);
      setText('');
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="flex h-[calc(100vh-8rem)] gap-4">
      <div className="w-64 shrink-0 rounded-2xl bg-white shadow-sm overflow-y-auto">
        <div className="p-4 border-b">
          <h2 className="text-sm font-semibold text-gray-700">Responsáveis</h2>
        </div>
        {contacts.length === 0 ? (
          <p className="p-4 text-xs text-gray-400">Nenhuma conversa ainda.</p>
        ) : (
          contacts.map((c) => (
            <button
              key={c.userId}
              onClick={() => setSelected(c.userId)}
              className={`w-full flex items-center justify-between px-4 py-3 text-left hover:bg-gray-50 transition-colors ${
                selected === c.userId ? 'bg-brand-50' : ''
              }`}
            >
              <span className="text-sm text-gray-900 truncate">{c.userId.slice(0, 8)}</span>
              {c.unread > 0 && (
                <span className="ml-2 rounded-full bg-brand-600 px-2 py-0.5 text-xs text-white">{c.unread}</span>
              )}
            </button>
          ))
        )}
      </div>

      <div className="flex-1 flex flex-col rounded-2xl bg-white shadow-sm overflow-hidden">
        {!selected ? (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-sm text-gray-400">Selecione uma conversa</p>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {messages.map((msg) => {
                const mine = msg.fromId === myId;
                return (
                  <div key={msg.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-xs rounded-2xl px-4 py-2 text-sm ${mine ? 'bg-brand-600 text-white' : 'bg-gray-100 text-gray-900'}`}>
                      <p>{msg.content}</p>
                      <p className={`mt-1 text-xs ${mine ? 'text-brand-200' : 'text-gray-400'}`}>
                        {new Date(msg.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                );
              })}
              <div ref={bottomRef} />
            </div>
            <form onSubmit={handleSend} className="flex gap-2 border-t p-3">
              <input
                type="text"
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Responder..."
                className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-600"
              />
              <button
                type="submit"
                disabled={sending || !text.trim()}
                className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
              >
                {sending ? '...' : 'Enviar'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
