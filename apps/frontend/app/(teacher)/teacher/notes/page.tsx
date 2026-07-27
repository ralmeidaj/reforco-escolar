'use client';

import { useState, useEffect } from 'react';
import { api } from '@/app/lib/api';

interface Session {
  id: string;
  scheduledAt: string;
  status: string;
  student?: { name: string };
  subject?: { name: string };
}

interface SessionNote {
  id: string;
  content: string;
  updatedAt: string;
}

export default function TeacherNotesPage() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [selected, setSelected] = useState('');
  const [notes, setNotes] = useState<SessionNote[]>([]);
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadingNotes, setLoadingNotes] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get<Session[]>('/sessions')
      .then(({ data }) => {
        const done = data.filter((s) => s.status === 'realizada' || s.status === 'confirmada');
        setSessions(done);
        if (done.length > 0) setSelected(done[0].id);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!selected) return;
    setLoadingNotes(true);
    setNotes([]);
    setContent('');
    api.get<SessionNote[]>(`/session-notes/${selected}`)
      .then(({ data }) => {
        setNotes(data);
        if (data.length > 0) setContent(data[0].content);
      })
      .catch(() => {})
      .finally(() => setLoadingNotes(false));
  }, [selected]);

  async function save() {
    if (!selected || !content.trim()) return;
    setSaving(true);
    setError('');
    try {
      const { data } = await api.post<SessionNote>('/session-notes', { sessionId: selected, content: content.trim() });
      setNotes([data]);
    } catch (err: any) {
      setError(err.response?.data?.message ?? 'Erro ao salvar nota');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Notas de Aula</h1>
        <p className="mt-1 text-sm text-gray-500">Registre o que foi trabalhado em cada sessão</p>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => <div key={i} className="h-16 animate-pulse rounded-2xl bg-gray-100" />)}
        </div>
      ) : sessions.length === 0 ? (
        <div className="rounded-2xl bg-white p-8 text-center shadow-sm">
          <p className="text-sm text-gray-500">Nenhuma sessão confirmada ou realizada para adicionar notas.</p>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
          {/* Lista de sessões */}
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 px-1">Sessões</p>
            {sessions.map((s) => (
              <button
                key={s.id}
                onClick={() => setSelected(s.id)}
                className={`w-full rounded-xl px-4 py-3 text-left transition-colors ${
                  selected === s.id ? 'bg-brand-600 text-white' : 'bg-white text-gray-700 shadow-sm hover:bg-gray-50'
                }`}
              >
                <p className="text-sm font-semibold truncate">{s.student?.name ?? '—'}</p>
                <p className={`text-xs truncate ${selected === s.id ? 'text-white/70' : 'text-gray-400'}`}>
                  {s.subject?.name ?? '—'} · {new Date(s.scheduledAt).toLocaleDateString('pt-BR')}
                </p>
              </button>
            ))}
          </div>

          {/* Editor de nota */}
          <div className="rounded-2xl bg-white p-5 shadow-sm space-y-4">
            {loadingNotes ? (
              <div className="h-32 animate-pulse rounded-xl bg-gray-100" />
            ) : (
              <>
                {notes.length > 0 && (
                  <p className="text-xs text-gray-400">
                    Última edição: {new Date(notes[0].updatedAt).toLocaleString('pt-BR')}
                  </p>
                )}
                <textarea
                  rows={10}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Descreva o que foi trabalhado nesta aula, dificuldades observadas, próximos passos..."
                  className="w-full resize-none rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-600"
                />
                {error && <p className="text-xs text-red-500">{error}</p>}
                <button
                  onClick={save}
                  disabled={saving || !content.trim()}
                  className="rounded-lg bg-brand-600 px-5 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
                >
                  {saving ? 'Salvando...' : 'Salvar nota'}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
