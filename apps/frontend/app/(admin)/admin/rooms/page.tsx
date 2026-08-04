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
interface ScheduleTeacher { id: string; teacher: { id: string; name: string } }
interface Schedule {
  id: string;
  dayOfWeek: number;
  shift: 'manhã' | 'tarde' | 'noite';
  subject: { id: string; name: string } | null;
  teachers: ScheduleTeacher[];
}

const SHIFTS: Array<'manhã' | 'tarde' | 'noite'> = ['manhã', 'tarde', 'noite'];
const SHIFT_LABELS = { manhã: 'Manhã', tarde: 'Tarde', noite: 'Noite' };
const DAY_LABELS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

export default function RoomsPage() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [checkins, setCheckins] = useState<ActiveCheckin[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: '', capacity: 10 });
  const [error, setError] = useState('');

  // reassign modal
  const [reassigning, setReassigning] = useState<ActiveCheckin | null>(null);
  const [newAssignmentId, setNewAssignmentId] = useState('');
  const [reassignSaving, setReassignSaving] = useState(false);

  // grade de horários
  const [scheduleRoom, setScheduleRoom] = useState<Room | null>(null);
  const [roomSchedules, setRoomSchedules] = useState<Schedule[]>([]);
  const [loadingSchedules, setLoadingSchedules] = useState(false);
  const [cellEdit, setCellEdit] = useState<{ dayOfWeek: number; shift: 'manhã' | 'tarde' | 'noite'; existing: Schedule | null } | null>(null);
  const [cellSubject, setCellSubject] = useState('');
  const [cellTeachers, setCellTeachers] = useState<string[]>([]);
  const [cellSaving, setCellSaving] = useState(false);
  const [subjectTeacherIds, setSubjectTeacherIds] = useState<Set<string>>(new Set());

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

  async function openScheduleModal(room: Room) {
    setScheduleRoom(room);
    setRoomSchedules([]);
    setCellEdit(null);
    setLoadingSchedules(true);
    try {
      const { data } = await api.get<Schedule[]>(`/rooms/${room.id}/schedules`);
      setRoomSchedules(data);
    } finally { setLoadingSchedules(false); }
  }

  async function openCellEdit(dayOfWeek: number, shift: 'manhã' | 'tarde' | 'noite') {
    const existing = roomSchedules.find((s) => s.dayOfWeek === dayOfWeek && s.shift === shift) ?? null;
    setCellEdit({ dayOfWeek, shift, existing });
    setCellTeachers(existing?.teachers.map((t) => t.teacher.id) ?? []);
    const subjectId = existing?.subject?.id ?? '';
    setCellSubject(subjectId);
    if (subjectId) {
      try {
        const { data } = await api.get<{ id: string; teacher: Teacher }[]>(`/teacher-subjects?subjectId=${subjectId}`);
        setSubjectTeacherIds(new Set(data.map((ts) => ts.teacher.id)));
      } catch { setSubjectTeacherIds(new Set()); }
    } else {
      setSubjectTeacherIds(new Set());
    }
  }

  async function handleSaveCell() {
    if (!scheduleRoom || !cellEdit) return;
    setCellSaving(true);
    try {
      await api.post(`/rooms/${scheduleRoom.id}/schedules`, {
        dayOfWeek: cellEdit.dayOfWeek,
        shift: cellEdit.shift,
        subjectId: cellSubject || undefined,
        teacherIds: cellTeachers,
      });
      const { data } = await api.get<Schedule[]>(`/rooms/${scheduleRoom.id}/schedules`);
      setRoomSchedules(data);
      setCellEdit(null);
    } finally { setCellSaving(false); }
  }

  async function handleDeleteCell() {
    if (!scheduleRoom || !cellEdit?.existing) return;
    setCellSaving(true);
    try {
      await api.delete(`/rooms/${scheduleRoom.id}/schedules/${cellEdit.existing.id}`);
      setRoomSchedules((prev) => prev.filter((s) => s.id !== cellEdit.existing!.id));
      setCellEdit(null);
    } finally { setCellSaving(false); }
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
                    <button
                      onClick={() => openScheduleModal(r)}
                      className="rounded-lg border border-gray-200 px-3 py-1 text-xs font-medium text-gray-600 hover:bg-gray-50"
                    >
                      Horários
                    </button>
                    <button onClick={() => handleDelete(r.id)} className="text-xs text-red-500 hover:text-red-700">
                      Remover
                    </button>
                  </div>

                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Modal de grade de horários */}
      {scheduleRoom && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-3xl rounded-2xl bg-white shadow-xl flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
              <div>
                <h3 className="text-base font-semibold text-gray-900">Horários — {scheduleRoom.name}</h3>
                <p className="text-xs text-gray-400 mt-0.5">Clique em uma célula para definir disciplina e professores</p>
              </div>
              <button onClick={() => { setScheduleRoom(null); setCellEdit(null); }} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
            </div>

            <div className="overflow-auto flex-1 p-4">
              {loadingSchedules ? (
                <div className="flex items-center justify-center py-12"><Spinner size="lg" className="text-brand-600" /></div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-sm">
                    <thead>
                      <tr>
                        <th className="w-20 py-2 text-left text-xs font-semibold text-gray-400" />
                        {DAY_LABELS.map((d, i) => (
                          <th key={i} className="py-2 text-center text-xs font-semibold text-gray-500">{d}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {SHIFTS.map((shift) => (
                        <tr key={shift}>
                          <td className="pr-3 py-1.5 text-xs font-semibold text-gray-500 whitespace-nowrap">
                            {SHIFT_LABELS[shift]}
                          </td>
                          {DAY_LABELS.map((_, dayOfWeek) => {
                            const slot = roomSchedules.find((s) => s.dayOfWeek === dayOfWeek && s.shift === shift);
                            const isEditing = cellEdit?.dayOfWeek === dayOfWeek && cellEdit?.shift === shift;
                            return (
                              <td key={dayOfWeek} className="py-1 px-1">
                                <button
                                  onClick={() => openCellEdit(dayOfWeek, shift)}
                                  className={cn(
                                    'w-full min-h-[56px] rounded-xl border p-2 text-left text-xs transition-all',
                                    isEditing
                                      ? 'border-brand-400 bg-brand-50 ring-1 ring-brand-400'
                                      : slot
                                        ? 'border-brand-200 bg-brand-50 hover:border-brand-400'
                                        : 'border-dashed border-gray-200 bg-gray-50 hover:border-gray-300 hover:bg-gray-100',
                                  )}
                                >
                                  {slot ? (
                                    <>
                                      {slot.subject && <div className="font-semibold text-brand-700 truncate">{slot.subject.name}</div>}
                                      {slot.teachers.length > 0 && (
                                        <div className="text-gray-500 truncate">
                                          {slot.teachers.map((t) => t.teacher.name.split(' ')[0]).join(', ')}
                                        </div>
                                      )}
                                    </>
                                  ) : (
                                    <span className="text-gray-300">+</span>
                                  )}
                                </button>
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Edição de célula inline */}
              {cellEdit && (
                <div className="mt-4 rounded-xl border border-brand-200 bg-brand-50 p-4 space-y-3">
                  <p className="text-xs font-semibold text-brand-700">
                    {DAY_LABELS[cellEdit.dayOfWeek]} — {SHIFT_LABELS[cellEdit.shift]}
                  </p>

                  <div className="flex flex-wrap gap-3">
                    <div className="flex-1 min-w-40">
                      <label className="mb-1 block text-xs font-medium text-gray-600">Disciplina</label>
                      <select
                        value={cellSubject}
                        onChange={async (e) => {
                          const subjectId = e.target.value;
                          setCellSubject(subjectId);
                          setCellTeachers([]);
                          if (subjectId) {
                            try {
                              const { data } = await api.get<{ id: string; teacher: Teacher }[]>(`/teacher-subjects?subjectId=${subjectId}`);
                              setSubjectTeacherIds(new Set(data.map((ts) => ts.teacher.id)));
                            } catch { setSubjectTeacherIds(new Set()); }
                          } else {
                            setSubjectTeacherIds(new Set());
                          }
                        }}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
                      >
                        <option value="">Sem disciplina</option>
                        {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                      </select>
                    </div>

                    <div className="flex-1 min-w-48">
                      <label className="mb-1 block text-xs font-medium text-gray-600">
                        Professores{cellSubject && subjectTeacherIds.size === 0 ? ' (nenhum vinculado a esta disciplina)' : ''}
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {(cellSubject ? teachers.filter((t) => subjectTeacherIds.has(t.id)) : teachers).map((t) => (
                          <label key={t.id} className="flex items-center gap-1.5 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={cellTeachers.includes(t.id)}
                              onChange={(e) =>
                                setCellTeachers((prev) =>
                                  e.target.checked ? [...prev, t.id] : prev.filter((id) => id !== t.id)
                                )
                              }
                              className="accent-brand-600"
                            />
                            <span className="text-sm text-gray-700">{t.name}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-between">
                    <div className="flex gap-2">
                      <button
                        onClick={handleSaveCell}
                        disabled={cellSaving}
                        className="rounded-lg bg-brand-600 px-4 py-2 text-xs font-semibold text-white hover:bg-brand-700 disabled:opacity-60 flex items-center gap-1"
                      >
                        {cellSaving ? <Spinner size="sm" className="text-white" /> : null}
                        Salvar
                      </button>
                      <button onClick={() => setCellEdit(null)} className="rounded-lg border border-gray-200 px-4 py-2 text-xs text-gray-600 hover:bg-gray-50">
                        Cancelar
                      </button>
                    </div>
                    {cellEdit.existing && (
                      <button
                        onClick={handleDeleteCell}
                        disabled={cellSaving}
                        className="rounded-lg px-4 py-2 text-xs text-red-500 hover:bg-red-50 disabled:opacity-60"
                      >
                        Remover horário
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

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
