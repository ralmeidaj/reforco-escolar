'use client';

import { useState, useEffect, useRef } from 'react';
import { api } from '@/app/lib/api';

interface Notification {
  id: string;
  title: string;
  body: string;
  type: string;
  read: boolean;
  createdAt: string;
}

const TYPE_ICONS: Record<string, string> = {
  task: '📋',
  attendance: '📅',
  session: '🏫',
  finance: '💰',
  info: '💬',
};

export function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  async function load() {
    try {
      const [notifs, count] = await Promise.all([
        api.get<Notification[]>('/notifications'),
        api.get<{ count: number }>('/notifications/unread-count'),
      ]);
      setNotifications(notifs.data);
      setUnread(count.data.count);
    } catch {}
  }

  useEffect(() => {
    load();
    const interval = setInterval(load, 30_000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  async function markAllRead() {
    await api.post('/notifications/read-all').catch(() => {});
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnread(0);
  }

  async function markOne(id: string) {
    await api.post(`/notifications/${id}/read`).catch(() => {});
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    setUnread((prev) => Math.max(0, prev - 1));
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
        aria-label="Notificações"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-10 z-50 w-80 rounded-2xl bg-white shadow-lg ring-1 ring-gray-200 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b">
            <span className="text-sm font-semibold text-gray-800">Notificações</span>
            {unread > 0 && (
              <button onClick={markAllRead} className="text-xs text-brand-600 hover:underline">
                Marcar todas como lidas
              </button>
            )}
          </div>
          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-gray-400">Nenhuma notificação</p>
            ) : (
              notifications.map((n) => (
                <button
                  key={n.id}
                  onClick={() => markOne(n.id)}
                  className={`w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-gray-50 border-b last:border-0 transition-colors ${
                    n.read ? 'opacity-60' : ''
                  }`}
                >
                  <span className="mt-0.5 text-lg shrink-0">{TYPE_ICONS[n.type] ?? '💬'}</span>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm ${n.read ? 'text-gray-600' : 'font-medium text-gray-900'}`}>{n.title}</p>
                    <p className="mt-0.5 text-xs text-gray-500 truncate">{n.body}</p>
                    <p className="mt-0.5 text-xs text-gray-400">
                      {new Date(n.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  {!n.read && <span className="mt-1.5 h-2 w-2 rounded-full bg-brand-600 shrink-0" />}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
