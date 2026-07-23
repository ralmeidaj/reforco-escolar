'use client';

import { useState, useEffect } from 'react';
import { api } from '@/app/lib/api';
import { Spinner } from '@/app/components/Spinner';

interface Group { id: string; name: string; level: string }

const LEVELS = [
  { value: 'infantil', label: 'Infantil' },
  { value: 'fundamental', label: 'Fundamental' },
  { value: 'medio', label: 'Médio' },
];

export default function GroupsPage() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: '', level: 'fundamental' });
  const [error, setError] = useState('');

  useEffect(() => {
    api.get<Group[]>('/groups')
      .then(({ data }) => setGroups(data))
      .finally(() => setLoading(false));
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const { data } = await api.post<Group>('/groups', form);
      setGroups((prev) => [...prev, data]);
      setForm({ name: '', level: 'fundamental' });
    } catch (err: any) {
      setError(err.response?.data?.message ?? 'Erro ao criar turma');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    await api.delete(`/groups/${id}`);
    setGroups((prev) => prev.filter((g) => g.id !== id));
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Turmas</h1>
        <p className="mt-1 text-sm text-gray-500">Gerencie as turmas e níveis da escola</p>
      </div>

      <div className="rounded-2xl bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-sm font-semibold text-gray-700">Nova turma</h2>
        <form onSubmit={handleCreate} className="flex flex-wrap gap-3">
          <input
            required
            disabled={saving}
            value={form.name}
            onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
            placeholder="Ex.: 5º Ano A"
            className="flex-1 min-w-48 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 disabled:opacity-60"
          />
          <select
            disabled={saving}
            value={form.level}
            onChange={(e) => setForm((p) => ({ ...p, level: e.target.value }))}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 disabled:opacity-60"
          >
            {LEVELS.map((l) => (
              <option key={l.value} value={l.value}>{l.label}</option>
            ))}
          </select>
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

      <div className="rounded-2xl bg-white shadow-sm">
        {loading ? (
          <div className="flex items-center justify-center p-12">
            <Spinner size="lg" className="text-brand-600" />
          </div>
        ) : groups.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-sm text-gray-400">Nenhuma turma cadastrada ainda.</p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {groups.map((g) => (
              <li key={g.id} className="flex items-center justify-between px-5 py-3">
                <div>
                  <span className="text-sm font-medium text-gray-900">{g.name}</span>
                  <span className="ml-2 rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500 capitalize">
                    {g.level}
                  </span>
                </div>
                <button
                  onClick={() => handleDelete(g.id)}
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
