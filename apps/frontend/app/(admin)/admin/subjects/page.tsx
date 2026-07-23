'use client';

import { useState, useEffect } from 'react';
import { api } from '@/app/lib/api';
import { Spinner } from '@/app/components/Spinner';

interface Subject { id: string; name: string; color: string; icon: string }

const COLORS = ['#3B82F6','#10B981','#F59E0B','#EF4444','#8B5CF6','#EC4899','#06B6D4','#84CC16'];

export default function SubjectsPage() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: '', color: '#3B82F6', icon: 'book' });
  const [error, setError] = useState('');

  useEffect(() => {
    api.get<Subject[]>('/subjects')
      .then(({ data }) => setSubjects(data))
      .finally(() => setLoading(false));
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const { data } = await api.post<Subject>('/subjects', form);
      setSubjects((prev) => [...prev, data]);
      setForm({ name: '', color: '#3B82F6', icon: 'book' });
    } catch (err: any) {
      setError(err.response?.data?.message ?? 'Erro ao criar disciplina');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    await api.delete(`/subjects/${id}`);
    setSubjects((prev) => prev.filter((s) => s.id !== id));
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Disciplinas</h1>
        <p className="mt-1 text-sm text-gray-500">Gerencie as disciplinas da sua escola</p>
      </div>

      {/* Formulário de criação */}
      <div className="rounded-2xl bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-sm font-semibold text-gray-700">Nova disciplina</h2>
        <form onSubmit={handleCreate} className="flex flex-wrap gap-3">
          <input
            required
            disabled={saving}
            value={form.name}
            onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
            placeholder="Ex.: Matemática"
            className="flex-1 min-w-48 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 disabled:opacity-60"
          />
          <div className="flex gap-1.5 items-center flex-wrap">
            {COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setForm((p) => ({ ...p, color: c }))}
                className="h-6 w-6 rounded-full border-2 transition-transform hover:scale-110"
                style={{
                  backgroundColor: c,
                  borderColor: form.color === c ? '#1D4ED8' : 'transparent',
                }}
              />
            ))}
          </div>
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {saving ? <><Spinner size="sm" className="text-white" /> Salvando...</> : 'Adicionar'}
          </button>
        </form>
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      </div>

      {/* Lista */}
      <div className="rounded-2xl bg-white shadow-sm">
        {loading ? (
          <div className="flex items-center justify-center p-12">
            <Spinner size="lg" className="text-brand-600" />
          </div>
        ) : subjects.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-sm text-gray-400">Nenhuma disciplina cadastrada ainda.</p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {subjects.map((s) => (
              <li key={s.id} className="flex items-center justify-between px-5 py-3">
                <div className="flex items-center gap-3">
                  <div className="h-3 w-3 rounded-full" style={{ backgroundColor: s.color }} />
                  <span className="text-sm font-medium text-gray-900">{s.name}</span>
                </div>
                <button
                  onClick={() => handleDelete(s.id)}
                  className="text-xs text-red-500 hover:text-red-700"
                >
                  Remover
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
