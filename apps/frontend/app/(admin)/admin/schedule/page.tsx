'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/app/lib/api';
import { Spinner } from '@/app/components/Spinner';
import { cn } from '@/app/lib/utils';

interface User    { id: string; name: string }
interface Subject { id: string; name: string; color: string }
interface Room    { id: string; name: string; capacity: number }
interface Session {
  id: string;
  scheduledAt: string;
  durationMinutes: number;
  status: 'agendada' | 'confirmada' | 'realizada' | 'cancelada';
  channel: 'presencial' | 'online';
  meetLink?: string;
  cancelReason?: string;
  teacher: User;
  student: User;
  subject: Subject;
  room?: Room | null;
}

const STATUS_LABELS: Record<string, string> = {
  agendada: 'Agendada',
  confirmada: 'Confirmada',
  realizada: 'Realizada',
  cancelada: 'Cancelada',
};

const STATUS_COLORS: Record<string, string> = {
  agendada:  'bg-blue-100 text-blue-700',
  confirmada:'bg-green-100 text-green-700',
  realizada: 'bg-gray-100 text-gray-600',
  cancelada: 'bg-red-100 text-red-500 line-through',
};

const WEEK_DAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

function startOfWeek(d: Date) {
  const day = d.getDay();
  const diff = d.getDate() - day;
  return new Date(d.getFullYear(), d.getMonth(), diff);
}

function addDays(d: Date, n: number) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
}

function isoDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

export default function SchedulePage() {
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);

  // Formulário de nova sessão
  const [teachers, setTeachers] = useState<User[]>([]);
  const [students, setStudents] = useState<User[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [form, setForm] = useState({
    teacherId: '', studentId: '', subjectId: '', roomId: '',
    scheduledAt: '', durationMinutes: 60, channel: 'presencial', meetLink: '',
  });

  // Modal de status
  const [statusModal, setStatusModal] = useState<Session | null>(null);
  const [newStatus, setNewStatus] = useState('');
  const [cancelReason, setCancelReason] = useState('');
  const [updatingStatus, setUpdatingStatus] = useState(false);

  const weekEnd = addDays(weekStart, 6);

  const loadSessions = useCallback(() => {
    setLoading(true);
    const from = weekStart.toISOString();
    const to   = new Date(weekEnd.getFullYear(), weekEnd.getMonth(), weekEnd.getDate(), 23, 59, 59).toISOString();
    return api.get<Session[]>(`/sessions?from=${from}&to=${to}`)
      .then(({ data }) => setSessions(data))
      .finally(() => setLoading(false));
  }, [weekStart]);  // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { loadSessions(); }, [loadSessions]);

  useEffect(() => {
    Promise.all([
      api.get<User[]>('/auth/users?role=teacher'),
      api.get<User[]>('/auth/users?role=student'),
      api.get<Subject[]>('/subjects'),
      api.get<Room[]>('/rooms'),
    ]).then(([t, s, sub, r]) => {
      setTeachers(t.data);
      setStudents(s.data);
      setSubjects(sub.data);
      setRooms(r.data);
    });
  }, []);

  // Agrupa sessões por dia
  const days = Array.from({ length: 7 }, (_, i) => {
    const day = addDays(weekStart, i);
    return {
      date: day,
      label: WEEK_DAYS[day.getDay()],
      dayNum: day.getDate(),
      sessions: sessions.filter((s) => s.scheduledAt.slice(0, 10) === isoDate(day)),
    };
  });

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setFormError('');
    setSaving(true);
    try {
      await api.post('/sessions', {
        ...form,
        roomId: form.roomId || undefined,
        meetLink: form.meetLink || undefined,
      });
      setShowForm(false);
      setForm({ teacherId: '', studentId: '', subjectId: '', roomId: '', scheduledAt: '', durationMinutes: 60, channel: 'presencial', meetLink: '' });
      await loadSessions();
    } catch (err: any) {
      setFormError(err.response?.data?.message ?? 'Erro ao agendar');
    } finally {
      setSaving(false);
    }
  }

  async function handleStatusUpdate() {
    if (!statusModal || !newStatus) return;
    setUpdatingStatus(true);
    try {
      await api.patch(`/sessions/${statusModal.id}/status`, { status: newStatus, cancelReason: cancelReason || undefined });
      setStatusModal(null);
      setCancelReason('');
      setNewStatus('');
      await loadSessions();
    } finally {
      setUpdatingStatus(false);
    }
  }

  const today = isoDate(new Date());

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Agendamento</h1>
          <p className="mt-1 text-sm text-gray-500">Calendário semanal de sessões</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
        >
          + Nova sessão
        </button>
      </div>

      {/* Navegação da semana */}
      <div className="flex items-center gap-3 rounded-2xl bg-white px-5 py-3 shadow-sm">
        <button
          onClick={() => setWeekStart((w) => addDays(w, -7))}
          className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100"
        >
          ◀
        </button>
        <span className="flex-1 text-center text-sm font-medium text-gray-700">
          {weekStart.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })} —{' '}
          {weekEnd.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}
        </span>
        <button
          onClick={() => setWeekStart((w) => addDays(w, 7))}
          className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100"
        >
          ▶
        </button>
        <button
          onClick={() => setWeekStart(startOfWeek(new Date()))}
          className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs text-gray-500 hover:bg-gray-50"
        >
          Hoje
        </button>
      </div>

      {/* Grade da semana */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Spinner size="lg" className="text-brand-600" />
        </div>
      ) : (
        <div className="grid grid-cols-7 gap-2">
          {days.map((day) => {
            const isToday = isoDate(day.date) === today;
            return (
              <div key={isoDate(day.date)} className="min-h-32">
                <div className={cn(
                  'mb-2 rounded-lg px-2 py-1 text-center text-xs font-medium',
                  isToday ? 'bg-brand-600 text-white' : 'bg-white text-gray-500',
                )}>
                  <div>{day.label}</div>
                  <div className={cn('text-lg font-bold', isToday ? 'text-white' : 'text-gray-900')}>{day.dayNum}</div>
                </div>

                <div className="space-y-1.5">
                  {day.sessions.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-gray-200 py-3 text-center text-xs text-gray-300">
                      —
                    </div>
                  ) : (
                    day.sessions.map((s) => (
                      <button
                        key={s.id}
                        onClick={() => { setStatusModal(s); setNewStatus(s.status); }}
                        className={cn(
                          'w-full rounded-lg px-2 py-1.5 text-left text-xs transition-all hover:opacity-80',
                          STATUS_COLORS[s.status],
                        )}
                      >
                        <div className="font-medium truncate">{s.student.name.split(' ')[0]}</div>
                        <div className="truncate opacity-70">{s.subject.name}</div>
                        <div className="opacity-60">{new Date(s.scheduledAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</div>
                      </button>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal de nova sessão */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="mb-4 text-base font-semibold text-gray-900">Nova sessão</h3>
            <form onSubmit={handleCreate} className="space-y-3">
              <select required value={form.teacherId} onChange={(e) => setForm(p => ({ ...p, teacherId: e.target.value }))} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500">
                <option value="">Professor...</option>
                {teachers.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
              <select required value={form.studentId} onChange={(e) => setForm(p => ({ ...p, studentId: e.target.value }))} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500">
                <option value="">Aluno...</option>
                {students.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
              <select required value={form.subjectId} onChange={(e) => setForm(p => ({ ...p, subjectId: e.target.value }))} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500">
                <option value="">Disciplina...</option>
                {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
              <div className="flex gap-2">
                <input required type="datetime-local" value={form.scheduledAt} onChange={(e) => setForm(p => ({ ...p, scheduledAt: e.target.value }))} className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500" />
                <input type="number" min={15} max={240} value={form.durationMinutes} onChange={(e) => setForm(p => ({ ...p, durationMinutes: Number(e.target.value) }))} className="w-20 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500" title="Duração (min)" />
              </div>
              <div className="flex gap-2">
                <select value={form.channel} onChange={(e) => setForm(p => ({ ...p, channel: e.target.value }))} className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500">
                  <option value="presencial">Presencial</option>
                  <option value="online">Online</option>
                </select>
                <select value={form.roomId} onChange={(e) => setForm(p => ({ ...p, roomId: e.target.value }))} className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500">
                  <option value="">Sala (auto)</option>
                  {rooms.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                </select>
              </div>
              {form.channel === 'online' && (
                <input type="url" value={form.meetLink} onChange={(e) => setForm(p => ({ ...p, meetLink: e.target.value }))} placeholder="Link da reunião" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500" />
              )}
              {formError && <p className="text-sm text-red-600">{formError}</p>}
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="rounded-lg px-4 py-2 text-sm text-gray-500 hover:bg-gray-100">Cancelar</button>
                <button type="submit" disabled={saving} className="flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60">
                  {saving ? <><Spinner size="sm" className="text-white" /> Salvando...</> : 'Agendar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de status */}
      {statusModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="mb-1 text-base font-semibold text-gray-900">
              {statusModal.student.name} — {statusModal.subject.name}
            </h3>
            <p className="mb-4 text-xs text-gray-400">
              {new Date(statusModal.scheduledAt).toLocaleString('pt-BR')} · {statusModal.teacher.name}
              {statusModal.room && ` · ${statusModal.room.name}`}
            </p>
            <select
              value={newStatus}
              onChange={(e) => setNewStatus(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            >
              {Object.entries(STATUS_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
            {newStatus === 'cancelada' && (
              <input
                className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                placeholder="Motivo do cancelamento"
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
              />
            )}
            <div className="mt-4 flex justify-end gap-2">
              <button onClick={() => setStatusModal(null)} className="rounded-lg px-4 py-2 text-sm text-gray-500 hover:bg-gray-100">Fechar</button>
              <button
                onClick={handleStatusUpdate}
                disabled={updatingStatus || (newStatus === 'cancelada' && !cancelReason)}
                className="flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
              >
                {updatingStatus ? <><Spinner size="sm" className="text-white" /> Salvando...</> : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
