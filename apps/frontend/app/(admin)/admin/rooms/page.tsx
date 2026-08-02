'use client';

import { useState, useEffect } from 'react';
import { api } from '@/app/lib/api';
import { Spinner } from '@/app/components/Spinner';
import { cn } from '@/app/lib/utils';

interface Room {
  id: string;
  name: string;
  capacity: number;
  currentOccupancy?: number;
  fixedGroup?: { id: string; name: string } | null;
  teacher?: { id: string; name: string } | null;
  subject?: { id: string; name: string } | null;
}
interface Teacher { id: string; name: string }
interface Subject { id: string; name: string }

export default function RoomsPage() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: '', capacity: 10, teacherId: '', subjectId: '' });
  const [error, setError] = useState('');

  function loadRooms() {
    return api.get<Room[]>('/rooms/occupancy').then(({ data }) => setRooms(data));
  }

  useEffect(() => {
    Promise.all([
      loadRooms(),
      api.get<Teacher[]>('/auth/users?role=teacher').then(({ data }) => setTeachers(data)),
      api.get<Subject[]>('/subjects').then(({ data }) => setSubjects(data)),
    ]).finally(() => setLoading(false));

    const interval = setInterval(loadRooms, 30_000);
    return () => clearInterval(interval);
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const payload: any = { name: form.name, capacity: form.capacity };
      if (form.teacherId) payload.teacherId = form.teacherId;
      if (form.subjectId) payload.subjectId = form.subjectId;
      await api.post('/rooms', payload);
      await loadRooms();
      setForm({ name: '', capacity: 10, teacherId: '', subjectId: '' });
    } catch (err: any) {
      setError(err.response?.data?.message ?? 'Erro ao criar sala');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    await api.delete(`/rooms/${id}`);
    setRooms((prev) => prev.filter((r) => r.id !== id));
  }

  function occupancyColor(current: number, capacity: number) {
    const pct = current / capacity;
    if (pct >= 1) return 'bg-red-100 text-red-700';
    if (pct >= 0.75) return 'bg-amber-100 text-amber-700';
    return 'bg-emerald-100 text-emerald-700';
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Salas</h1>
          <p className="mt-1 text-sm text-gray-500">Configure professor e disciplina por sala</p>
        </div>
        <button
          onClick={() => {
            const parts = window.location.hostname.split('.');
            const slug = parts.length >= 3 ? parts[0] : '';
            window.open(`/kiosk${slug ? `?tenant=${slug}` : ''}`, '_blank');
          }}
          className="shrink-0 flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
          Abrir Kiosk
        </button>
      </div>

      <div className="rounded-2xl bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-sm font-semibold text-gray-700">Nova sala</h2>
        <form onSubmit={handleCreate} className="space-y-3">
          <div className="flex flex-wrap gap-3">
            <input
              required
              disabled={saving}
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              placeholder="Ex.: Sala de Matemática"
              className="flex-1 min-w-48 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 disabled:opacity-60"
            />
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-500 whitespace-nowrap">Capacidade:</label>
              <input
                type="number" min={1} max={50} disabled={saving}
                value={form.capacity}
                onChange={(e) => setForm((p) => ({ ...p, capacity: Number(e.target.value) }))}
                className="w-20 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 disabled:opacity-60"
              />
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <select
              disabled={saving}
              value={form.teacherId}
              onChange={(e) => setForm((p) => ({ ...p, teacherId: e.target.value }))}
              className="flex-1 min-w-48 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 disabled:opacity-60"
            >
              <option value="">Professor (opcional)</option>
              {teachers.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
            <select
              disabled={saving}
              value={form.subjectId}
              onChange={(e) => setForm((p) => ({ ...p, subjectId: e.target.value }))}
              className="flex-1 min-w-48 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 disabled:opacity-60"
            >
              <option value="">Disciplina (opcional)</option>
              {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            <button
              type="submit" disabled={saving}
              className="flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {saving ? <><Spinner size="sm" className="text-white" /> Salvando...</> : 'Adicionar'}
            </button>
          </div>
        </form>
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      </div>

      <div className="rounded-2xl bg-white shadow-sm">
        {loading ? (
          <div className="flex items-center justify-center p-12">
            <Spinner size="lg" className="text-brand-600" />
          </div>
        ) : rooms.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-sm text-gray-400">Nenhuma sala cadastrada ainda.</p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {rooms.map((r) => {
              const occ = r.currentOccupancy ?? 0;
              return (
                <li key={r.id} className="flex items-center gap-4 px-5 py-4">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900">{r.name}</p>
                    <div className="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5">
                      {r.teacher && <p className="text-xs text-gray-500">👨‍🏫 {r.teacher.name}</p>}
                      {r.subject && <p className="text-xs text-brand-600 font-medium">📚 {r.subject.name}</p>}
                      {r.fixedGroup && <p className="text-xs text-gray-400">Turma: {r.fixedGroup.name}</p>}
                      {!r.teacher && !r.subject && <p className="text-xs text-gray-300">Sem professor/disciplina configurado</p>}
                    </div>
                  </div>

                  <div className="flex w-32 flex-col gap-1">
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>{occ} / {r.capacity}</span>
                      <span className={cn('rounded-full px-1.5 py-0.5 text-xs font-medium', occupancyColor(occ, r.capacity))}>
                        {occ >= r.capacity ? 'Cheio' : occ === 0 ? 'Vazia' : 'Ocupada'}
                      </span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-gray-200">
                      <div
                        className={cn('h-1.5 rounded-full transition-all', occ >= r.capacity ? 'bg-red-500' : occ / r.capacity >= 0.75 ? 'bg-amber-400' : 'bg-emerald-500')}
                        style={{ width: `${Math.min(100, (occ / r.capacity) * 100)}%` }}
                      />
                    </div>
                  </div>

                  <button onClick={() => handleDelete(r.id)} className="text-xs text-red-500 hover:text-red-700">
                    Remover
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
