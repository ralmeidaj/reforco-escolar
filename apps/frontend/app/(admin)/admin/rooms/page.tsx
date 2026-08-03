'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/app/lib/api';
import { Spinner } from '@/app/components/Spinner';
import { cn } from '@/app/lib/utils';

interface Assignment {
  id: string;
  teacher: { id: string; name: string };
  subject: { id: string; name: string } | null;
}

interface Room {
  id: string;
  name: string;
  capacity: number;
  currentOccupancy?: number;
  fixedGroup?: { id: string; name: string } | null;
  assignments: Assignment[];
}

interface ActiveCheckin {
  checkinId: string;
  checkinAt: string;
  studentId: string;
  studentName: string;
  roomId: string;
  roomName: string;
  sessionId: string | null;
  teacherId: string | null;
  teacherName: string | null;
}

interface Teacher { id: string; name: string }
interface Subject { id: string; name: string }

export default function RoomsPage() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [checkins, setCheckins] = useState<ActiveCheckin[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: '', capacity: 10 });
  const [error, setError] = useState('');

  // assignment form por sala
  const [addingTo, setAddingTo] = useState<string | null>(null);
  const [aForm, setAForm] = useState({ teacherId: '', subjectId: '' });
  const [aSaving, setASaving] = useState(false);

  // reassign modal
  const [reassigning, setReassigning] = useState<ActiveCheckin | null>(null);
  const [newAssignmentId, setNewAssignmentId] = useState('');
  const [reassignSaving, setReassignSaving] = useState(false);

  const loadRooms = useCallback(() =>
    api.get<Room[]>('/rooms/occupancy').then(({ data }) => setRooms(data)), []);

  const loadCheckins = useCallback(() =>
    api.get<ActiveCheckin[]>('/rooms/checkins/active').then(({ data }) => setCheckins(data)).catch(() => {}), []);

  useEffect(() => {
    Promise.all([
      loadRooms(),
      loadCheckins(),
      api.get<Teacher[]>('/auth/users?role=teacher').then(({ data }) => setTeachers(data)),
      api.get<Subject[]>('/subjects').then(({ data }) => setSubjects(data)),
    ]).finally(() => setLoading(false));

    const interval = setInterval(() => { loadRooms(); loadCheckins(); }, 30_000);
    return () => clearInterval(interval);
  }, [loadRooms, loadCheckins]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(''); setSaving(true);
    try {
      await api.post('/rooms', { name: form.name, capacity: form.capacity });
      await loadRooms();
      setForm({ name: '', capacity: 10 });
    } catch (err: any) {
      setError(err.response?.data?.message ?? 'Erro ao criar sala');
    } finally { setSaving(false); }
  }

  async function handleDelete(id: string) {
    await api.delete(`/rooms/${id}`);
    setRooms((prev) => prev.filter((r) => r.id !== id));
  }

  async function handleAddAssignment(roomId: string) {
    if (!aForm.teacherId) return;
    setASaving(true);
    try {
      const payload: any = { teacherId: aForm.teacherId };
      if (aForm.subjectId) payload.subjectId = aForm.subjectId;
      await api.post(`/rooms/${roomId}/assignments`, payload);
      await loadRooms();
      setAddingTo(null);
      setAForm({ teacherId: '', subjectId: '' });
    } catch {} finally { setASaving(false); }
  }

  async function handleRemoveAssignment(roomId: string, assignmentId: string) {
    await api.delete(`/rooms/${roomId}/assignments/${assignmentId}`);
    await loadRooms();
  }

  async function handleReassign() {
    if (!reassigning || !newAssignmentId) return;
    setReassignSaving(true);
    try {
      await api.patch(`/rooms/checkins/${reassigning.checkinId}/reassign`, { assignmentId: newAssignmentId });
      await loadCheckins();
      setReassigning(null);
      setNewAssignmentId('');
    } catch {} finally { setReassignSaving(false); }
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
          <p className="mt-1 text-sm text-gray-500">Configure professores e disciplinas por sala</p>
        </div>
        <button
          onClick={async () => {
            try {
              const { data } = await api.get<{ slug: string }>('/tenants/me');
              window.open(`/kiosk?tenant=${data.slug}`, '_blank');
            } catch { window.open('/kiosk', '_blank'); }
          }}
          className="shrink-0 flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
          Abrir Kiosk
        </button>
      </div>

      {/* Alunos em check-in ativo */}
      {checkins.length > 0 && (
        <div className="rounded-2xl bg-blue-50 border border-blue-100 p-5 space-y-3">
          <h2 className="text-sm font-semibold text-blue-800">Alunos na escola agora</h2>
          <ul className="space-y-2">
            {checkins.map((c) => (
              <li key={c.checkinId} className="flex items-center justify-between gap-3 rounded-xl bg-white px-4 py-2.5">
                <div>
                  <p className="text-sm font-medium text-gray-900">{c.studentName}</p>
                  <p className="text-xs text-gray-400">
                    {c.roomName} · {c.teacherName ? `Prof. ${c.teacherName}` : 'Sem professor'} ·{' '}
                    {new Date(c.checkinAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
                <button
                  onClick={() => { setReassigning(c); setNewAssignmentId(''); }}
                  className="rounded-lg border border-gray-200 px-3 py-1 text-xs font-medium text-gray-600 hover:bg-gray-50"
                >
                  Trocar professor
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Criar sala */}
      <div className="rounded-2xl bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-sm font-semibold text-gray-700">Nova sala</h2>
        <form onSubmit={handleCreate} className="flex flex-wrap gap-3">
          <input
            required disabled={saving} value={form.name}
            onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
            placeholder="Ex.: Sala de Matemática"
            className="flex-1 min-w-48 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 disabled:opacity-60"
          />
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-500 whitespace-nowrap">Capacidade:</label>
            <input
              type="number" min={1} max={50} disabled={saving} value={form.capacity}
              onChange={(e) => setForm((p) => ({ ...p, capacity: Number(e.target.value) }))}
              className="w-20 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 disabled:opacity-60"
            />
          </div>
          <button
            type="submit" disabled={saving}
            className="flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
          >
            {saving ? <><Spinner size="sm" className="text-white" /> Salvando...</> : 'Adicionar'}
          </button>
        </form>
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      </div>

      {/* Lista de salas */}
      <div className="rounded-2xl bg-white shadow-sm">
        {loading ? (
          <div className="flex items-center justify-center p-12"><Spinner size="lg" className="text-brand-600" /></div>
        ) : rooms.length === 0 ? (
          <div className="p-8 text-center"><p className="text-sm text-gray-400">Nenhuma sala cadastrada ainda.</p></div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {rooms.map((r) => {
              const occ = r.currentOccupancy ?? 0;
              return (
                <li key={r.id} className="px-5 py-4 space-y-3">
                  {/* Header da sala */}
                  <div className="flex items-center gap-4">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900">{r.name}</p>
                      {r.fixedGroup && <p className="text-xs text-gray-400">Turma: {r.fixedGroup.name}</p>}
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
                  </div>

                  {/* Professores alocados */}
                  <div className="pl-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      {r.assignments.map((a) => (
                        <div key={a.id} className="flex items-center gap-1.5 rounded-full bg-brand-50 border border-brand-200 px-3 py-1 text-xs">
                          <span className="font-medium text-brand-700">{a.teacher.name}</span>
                          {a.subject && <span className="text-brand-500">· {a.subject.name}</span>}
                          <button
                            onClick={() => handleRemoveAssignment(r.id, a.id)}
                            className="ml-1 text-brand-400 hover:text-red-500 font-bold leading-none"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                      <button
                        onClick={() => { setAddingTo(r.id); setAForm({ teacherId: '', subjectId: '' }); }}
                        className="rounded-full border border-dashed border-gray-300 px-3 py-1 text-xs text-gray-400 hover:border-brand-400 hover:text-brand-600"
                      >
                        + Professor
                      </button>
                    </div>

                    {/* Form inline de adicionar professor */}
                    {addingTo === r.id && (
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <select
                          value={aForm.teacherId}
                          onChange={(e) => setAForm((p) => ({ ...p, teacherId: e.target.value }))}
                          className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-brand-500 focus:outline-none"
                        >
                          <option value="">Selecione professor...</option>
                          {teachers.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                        </select>
                        <select
                          value={aForm.subjectId}
                          onChange={(e) => setAForm((p) => ({ ...p, subjectId: e.target.value }))}
                          className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-brand-500 focus:outline-none"
                        >
                          <option value="">Disciplina (opcional)</option>
                          {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                        <button
                          onClick={() => handleAddAssignment(r.id)}
                          disabled={!aForm.teacherId || aSaving}
                          className="rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-700 disabled:opacity-60 flex items-center gap-1"
                        >
                          {aSaving ? <Spinner size="sm" className="text-white" /> : null}
                          Adicionar
                        </button>
                        <button onClick={() => setAddingTo(null)} className="text-xs text-gray-400 hover:text-gray-600">Cancelar</button>
                      </div>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Modal de reassign */}
      {reassigning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="mb-1 text-base font-semibold text-gray-900">Trocar professor</h3>
            <p className="mb-4 text-sm text-gray-500">
              Aluno: <strong>{reassigning.studentName}</strong> · Sala: {reassigning.roomName}
            </p>
            <p className="mb-1 text-xs text-gray-400">Professor atual: {reassigning.teacherName ?? '—'}</p>
            <select
              value={newAssignmentId}
              onChange={(e) => setNewAssignmentId(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm mb-4 focus:border-brand-500 focus:outline-none"
            >
              <option value="">Selecione novo professor...</option>
              {rooms
                .find((r) => r.id === reassigning.roomId)
                ?.assignments
                .filter((a) => a.teacher.id !== reassigning.teacherId)
                .map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.teacher.name}{a.subject ? ` · ${a.subject.name}` : ''}
                  </option>
                ))}
            </select>
            <div className="flex justify-end gap-2">
              <button onClick={() => setReassigning(null)} className="rounded-lg px-4 py-2 text-sm text-gray-500 hover:bg-gray-100">Cancelar</button>
              <button
                onClick={handleReassign}
                disabled={!newAssignmentId || reassignSaving}
                className="flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
              >
                {reassignSaving ? <><Spinner size="sm" className="text-white" /> Salvando...</> : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
