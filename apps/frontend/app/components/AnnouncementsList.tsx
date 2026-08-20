'use client';

import { useState, useEffect } from 'react';
import { api } from '@/app/lib/api';

interface Announcement {
  id: string;
  title: string;
  content: string;
  createdAt: string;
}

function SkeletonCard() {
  return <div className="h-24 animate-pulse rounded-2xl bg-gray-100" />;
}

export function AnnouncementsList() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<Announcement[]>('/announcements')
      .then(({ data }) => setAnnouncements(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-3">
        {[...Array(3)].map((_, i) => <SkeletonCard key={i} />)}
      </div>
    );
  }

  if (announcements.length === 0) {
    return (
      <div className="rounded-2xl bg-white p-8 text-center shadow-sm">
        <p className="text-sm text-gray-400">Nenhum aviso no momento.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {announcements.map((a) => (
        <div key={a.id} className="rounded-2xl bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <h3 className="text-sm font-semibold text-gray-900">{a.title}</h3>
            <span className="shrink-0 text-xs text-gray-400">
              {new Date(a.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
          <p className="mt-2 whitespace-pre-wrap text-sm text-gray-600">{a.content}</p>
        </div>
      ))}
    </div>
  );
}
