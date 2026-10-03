'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/app/lib/api';
import { cn } from '@/app/lib/utils';

interface Student  { id: string; name: string; email: string }
interface Session  { id: string; scheduledAt: string; status: string; subject?: { name: string } | null }
interface AgendaEntry {
  id: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  session: { id: string; scheduledAt: string; subject?: { name: string } | null };
  teacher: { id: string; name: string };
}

export default function StudentAgendaPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState('');

  const [selected, setSelected] = useState<Student | null>(null);
  const [entries, setEntries]   = useState<AgendaEntry[]>([]);
  const [loadingEntries, setLoadingEntries] = useState(false);

  const [sessions, setSessions] = useState<Session[]>([]);
  const [sessionId, setSessionId] = useState('');
  const [content, setContent]   = useState('');
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState('');

  const [mobileView, setMobileView] = useState<'list' | 'agenda'>('list');

  useEffect(() => {
    api.get<Student[]>('/auth/users?role=student')
      .then(({ data }) => setStudents(data))
      .finally(() => setLoading(false));
  }, []);

  const loadEntries = useCallback(async (studentId: string) => {
    setLoadingEntries(true);
    try {
      const { data } = await api.get<AgendaEntry[]>(`/session-notes/student/${studentId}`);
      setEntries(data);
    } finally {
      setLoadingEntries(false);
    }
  }, []);

  function selectStudent(student: Student) {
    setSelected(student);
    setError('');
    setContent('');
    loadEntries(student.id);
    setMobileView('agenda');
    api.get<Session[]>(`/sessions?studentId=${student.id}`)
      .then(({ data }) => {
        const eligible = data
          .filter((s) => s.status === 'confirmada' || s.status === 'realizada')
          .sort((a, b) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime());
        setSessions(eligible);
        setSessionId(eligible.length > 0 ? eligible[0].id : '');
      })
      .catch(() => { setSessions([]); setSessionId(''); });
  }

  async function addEntry() {
    if (!sessionId || !content.trim()) {
      setError('Selecione a aula e descreva o que foi feito');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await api.post('/session-notes', { sessionId, content: content.trim() });
      setContent('');
      if (selected) await loadEntries(selected.id);
    } catch (err: any) {
      setError(err.response?.data?.message ?? 'Erro ao registrar a agenda');
    } finally {
      setSaving(false);
    }
  }

  const filtered = students.filter((s) =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Agenda do Aluno</h1>
        <p className="mt-1 text-sm text-gray-500">Registro diário do que foi trabalhado com o aluno, por todos os professores</p>
      </div>

      <div className="flex flex-col gap-4 lg:flex-row" style={{ minHeight: '70vh' }}>
        {/* Painel esquerdo — lista de alunos */}
        <div className={`flex flex-col rounded-2xl bg-white shadow-sm lg:w-72 lg:shrink-0 ${mobileView === 'agenda' ? 'hidden lg:flex' : 'flex'}`}>
          <div className="border-b border-gray-100 p-3">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar aluno..."
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-brand-400 focus:ring-1 focus:ring-brand-400"
            />
          </div>

          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="space-y-2 p-3">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-12 animate-pulse rounded-xl bg-gray-100" />
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <p className="p-4 text-center text-sm text-gray-400">
                {search ? 'Nenhum aluno encontrado.' : 'Nenhum aluno cadastrado.'}
              </p>
            ) : (
              filtered.map((student) => (
                <button
                  key={student.id}
                  onClick={() => selectStudent(student)}
                  className={cn(
                    'flex w-full flex-col items-start border-b border-gray-50 px-4 py-3 text-left transition-colors hover:bg-brand-50',
                    selected?.id === student.id && 'bg-brand-50 border-l-4 border-l-brand-600',
                  )}
                >
                  <span className="text-sm font-medium text-gray-900">{student.name}</span>
                  <span className="text-xs text-gray-400">{student.email}</span>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Painel direito — nova entrada + histórico */}
        <div className={`flex-1 rounded-2xl bg-white shadow-sm ${mobileView === 'list' ? 'hidden lg:block' : 'block'}`}>
          {!selected ? (
            <div className="flex h-full items-center justify-center text-gray-400">
              <div className="text-center">
                <div className="text-4xl">👈</div>
                <p className="mt-2 text-sm">Selecione um aluno para ver a agenda</p>
              </div>
            </div>
          ) : (
            <div className="p-4 lg:p-6">
              <div className="mb-5 flex items-center gap-3">
                <button
                  onClick={() => setMobileView('list')}
                  className="shrink-0 rounded-lg border border-gray-200 p-1.5 text-gray-500 hover:bg-gray-50 lg:hidden"
                  aria-label="Voltar"
                >
                  ←
                </button>
                <div className="min-w-0">
                  <h2 className="truncate text-base font-semibold text-gray-900">{selected.name}</h2>
                  <p className="truncate text-sm text-gray-400">{selected.email}</p>
                </div>
              </div>

              <div className="mb-6 space-y-3 rounded-xl border border-gray-100 bg-gray-50 p-4">
                {sessions.length === 0 ? (
                  <p className="text-sm text-gray-400">
                    Nenhuma aula confirmada ou realizada encontrada para este aluno — não é possível registrar a agenda ainda.
                  </p>
                ) : (
                  <>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-gray-500">Aula</label>
                      <select
                        value={sessionId}
                        onChange={(e) => setSessionId(e.target.value)}
                        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-brand-400 focus:ring-1 focus:ring-brand-400"
                      >
                        {sessions.map((s) => (
                          <option key={s.id} value={s.id}>
                            {new Date(s.scheduledAt).toLocaleDateString('pt-BR')} · {s.subject?.name ?? '—'}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-gray-500">O que foi feito com o aluno</label>
                      <textarea
                        rows={3}
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        placeholder="Ex: revisamos fração, fez a lição de casa, precisa reforçar tabuada..."
                        className="w-full resize-none rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-brand-400 focus:ring-1 focus:ring-brand-400"
                      />
                    </div>
                    <button
                      onClick={addEntry}
                      disabled={saving || !content.trim()}
                      className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
                    >
                      {saving ? 'Salvando...' : 'Adicionar à agenda'}
                    </button>
                  </>
                )}
                {error && <p className="text-xs text-red-500">{error}</p>}
              </div>

              {loadingEntries ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => <div key={i} className="h-16 animate-pulse rounded-xl bg-gray-100" />)}
                </div>
              ) : entries.length === 0 ? (
                <p className="text-sm text-gray-400">Nenhum registro na agenda ainda.</p>
              ) : (
                <div className="space-y-3">
                  {entries.map((e) => (
                    <div key={e.id} className="rounded-xl border border-gray-100 bg-white px-4 py-3 shadow-sm">
                      <div className="mb-1 flex items-center justify-between">
                        <p className="text-sm font-medium text-gray-900">
                          {new Date(e.session.scheduledAt).toLocaleDateString('pt-BR')}
                          <span className="text-gray-400 font-normal"> · {e.session.subject?.name ?? '—'}</span>
                        </p>
                        <span className="text-xs text-gray-400">{e.teacher.name}</span>
                      </div>
                      <p className="text-sm text-gray-600 whitespace-pre-wrap">{e.content}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
