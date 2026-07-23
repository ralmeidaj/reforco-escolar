'use client';

import { useState, useEffect } from 'react';
import { api } from '@/app/lib/api';

interface StudyLog {
  id: string;
  topic: string;
  pagesRead: number;
  studiedAt: string;
  subject?: { name: string };
}

interface Subject { id: string; name: string }

export default function StudentStudyLogPage() {
  const [logs, setLogs] = useState<StudyLog[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ subjectId: '', topic: '', pagesRead: 0, studiedAt: new Date().toISOString().slice(0, 10) });
  const [error, setError] = useState('');

  async function loadLogs() {
    const { data } = await api.get<StudyLog[]>('/study-logs/me');
    setLogs(data);
  }

  useEffect(() => {
    Promise.all([api.get<StudyLog[]>('/study-logs/me'), api.get<Subject[]>('/subjects')])
      .then(([l, s]) => {
        setLogs(l.data);
        setSubjects(s.data);
      })
      .finally(() => setLoading(false));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      await api.post('/study-logs', {
        subjectId: form.subjectId,
        topic: form.topic,
        pagesRead: form.pagesRead,
        studiedAt: form.studiedAt,
      });
      await loadLogs();
      setForm((f) => ({ ...f, topic: '', pagesRead: 0 }));
    } catch (err: any) {
      setError(err.response?.data?.message ?? 'Erro ao salvar registro');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 animate-pulse rounded bg-gray-200" />
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-16 animate-pulse rounded-2xl bg-gray-100" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Diário de Estudo</h1>
        <p className="mt-1 text-sm text-gray-500">Registre o que você estudou hoje</p>
      </div>

      <form onSubmit={handleSubmit} className="rounded-2xl bg-white p-5 shadow-sm space-y-4">
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Disciplina</label>
            <select
              required
              value={form.subjectId}
              onChange={(e) => setForm((f) => ({ ...f, subjectId: e.target.value }))}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-600"
            >
              <option value="">Selecione...</option>
              {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Data</label>
            <input
              type="date"
              required
              value={form.studiedAt}
              onChange={(e) => setForm((f) => ({ ...f, studiedAt: e.target.value }))}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-600"
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Assunto estudado</label>
          <input
            required
            type="text"
            value={form.topic}
            onChange={(e) => setForm((f) => ({ ...f, topic: e.target.value }))}
            placeholder="Ex.: Equações do 2º grau"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-600"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Páginas lidas</label>
          <input
            type="number"
            min={0}
            value={form.pagesRead}
            onChange={(e) => setForm((f) => ({ ...f, pagesRead: Number(e.target.value) }))}
            className="w-32 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-600"
          />
        </div>
        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
        >
          {saving ? 'Salvando...' : 'Registrar estudo'}
        </button>
      </form>

      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-gray-700">Histórico</h2>
        {logs.length === 0 ? (
          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-sm text-gray-400">Nenhum registro ainda. Comece a registrar seu estudo!</p>
          </div>
        ) : (
          logs.map((log) => (
            <div key={log.id} className="rounded-2xl bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-gray-900">{log.topic}</p>
                  <p className="mt-0.5 text-xs text-gray-500">
                    {log.subject?.name ?? '—'}
                    {' · '}
                    {new Date(log.studiedAt).toLocaleDateString('pt-BR')}
                    {log.pagesRead > 0 ? ` · ${log.pagesRead} pág.` : ''}
                  </p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
