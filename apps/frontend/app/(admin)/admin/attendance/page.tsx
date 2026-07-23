'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/app/lib/api';
import { cn } from '@/app/lib/utils';
import { LoadingOverlay } from '@/app/components/LoadingOverlay';

interface User    { id: string; name: string }
interface Subject { id: string; name: string; color: string }
interface Room    { id: string; name: string }
interface Session {
  id: string;
  scheduledAt: string;
  durationMinutes: number;
  status: 'agendada' | 'confirmada' | 'realizada' | 'cancelada';
  channel: 'presencial' | 'online';
  teacher: User;
  student: User;
  subject: Subject;
  room?: Room | null;
}
interface Attendance {
  id: string;
  sessionId: string;
  studentId: string;
  status: 'presente' | 'ausente' | 'justificado';
}

type AttendanceStatus = 'presente' | 'ausente' | 'justificado';

const STATUS_BADGE: Record<string, string> = {
  agendada:   'bg-blue-100 text-blue-700',
  confirmada: 'bg-green-100 text-green-700',
  realizada:  'bg-gray-100 text-gray-600',
  cancelada:  'bg-red-100 text-red-400',
};

const STATUS_LABEL: Record<string, string> = {
  agendada: 'Agendada', confirmada: 'Confirmada', realizada: 'Realizada', cancelada: 'Cancelada',
};

const ATTENDANCE_BTN: Record<AttendanceStatus, string> = {
  presente:   'bg-green-500 text-white border-green-500',
  ausente:    'bg-red-500 text-white border-red-500',
  justificado:'bg-yellow-400 text-white border-yellow-400',
};

const ATTENDANCE_IDLE: Record<AttendanceStatus, string> = {
  presente:   'border-green-300 text-green-600 hover:bg-green-50',
  ausente:    'border-red-300 text-red-600 hover:bg-red-50',
  justificado:'border-yellow-300 text-yellow-600 hover:bg-yellow-50',
};

function isoDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

function addDays(d: Date, n: number) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
}

const STATUSES: AttendanceStatus[] = ['presente', 'ausente', 'justificado'];
const LABELS: Record<AttendanceStatus, string> = { presente: 'Presente', ausente: 'Ausente', justificado: 'Justificado' };

export default function AttendancePage() {
  const [date, setDate] = useState(() => new Date());
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  // Map sessionId → attendance record
  const [attendanceMap, setAttendanceMap] = useState<Record<string, Attendance>>({});
  // Set of sessionIds currently saving
  const [saving, setSaving] = useState<Set<string>>(new Set());
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [overlayVisible, setOverlayVisible] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    const from = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0).toISOString();
    const to   = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59).toISOString();
    try {
      const { data: sess } = await api.get<Session[]>(`/sessions?from=${from}&to=${to}`);
      setSessions(sess);

      const aMap: Record<string, Attendance> = {};
      await Promise.all(
        sess
          .filter((s) => s.status !== 'cancelada')
          .map((s) =>
            api.get<Attendance[]>(`/attendances/session/${s.id}`)
              .then(({ data }) => { if (data[0]) aMap[s.id] = data[0]; })
              .catch(() => {}),
          ),
      );
      setAttendanceMap(aMap);
    } finally {
      setLoading(false);
    }
  }, [date]);

  useEffect(() => { loadData(); }, [loadData]);

  async function recordAttendance(session: Session, status: AttendanceStatus) {
    if (saving.has(session.id)) return;
    setSaving((prev) => new Set(prev).add(session.id));
    setOverlayVisible(true);
    try {
      await api.post<Attendance>('/attendances', {
        sessionId: session.id,
        studentId: session.student.id,
        status,
      });
      setAttendanceMap((prev) => ({
        ...prev,
        [session.id]: { ...prev[session.id], sessionId: session.id, studentId: session.student.id, status },
      }));
    } finally {
      setSaving((prev) => { const s = new Set(prev); s.delete(session.id); setOverlayVisible(s.size > 0); return s; });
    }
  }

  const visible = sessions.filter((s) => {
    if (s.status === 'cancelada') return false;
    if (statusFilter !== 'all' && s.status !== statusFilter) return false;
    return true;
  });

  const today = isoDate(new Date());
  const isToday = isoDate(date) === today;

  const presenceCount = Object.values(attendanceMap).filter((a) => a.status === 'presente').length;
  const absenceCount  = Object.values(attendanceMap).filter((a) => a.status === 'ausente').length;
  const pendingCount  = visible.filter((s) => !attendanceMap[s.id]).length;

  return (
    <div className="space-y-6">
      <LoadingOverlay visible={overlayVisible} message="Salvando presença..." />

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Presenças</h1>
          <p className="mt-1 text-sm text-gray-500">Registro de presença por sessão</p>
        </div>

        {/* Seletor de data */}
        <div className="flex items-center gap-2 rounded-xl bg-white px-4 py-2 shadow-sm">
          <button
            onClick={() => setDate((d) => addDays(d, -1))}
            className="rounded p-1 text-gray-400 hover:bg-gray-100"
          >
            ◀
          </button>
          <input
            type="date"
            value={isoDate(date)}
            onChange={(e) => setDate(new Date(e.target.value + 'T12:00:00'))}
            className="border-none text-sm font-medium text-gray-700 focus:outline-none"
          />
          <button
            onClick={() => setDate((d) => addDays(d, 1))}
            className="rounded p-1 text-gray-400 hover:bg-gray-100"
          >
            ▶
          </button>
          {!isToday && (
            <button
              onClick={() => setDate(new Date())}
              className="rounded border border-gray-200 px-2 py-1 text-xs text-gray-500 hover:bg-gray-50"
            >
              Hoje
            </button>
          )}
        </div>
      </div>

      {/* KPIs */}
      {!loading && (
        <div className="grid grid-cols-3 gap-4">
          <div className="rounded-2xl bg-white p-4 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Presentes</p>
            <p className="mt-1 text-3xl font-bold text-green-600">{presenceCount}</p>
          </div>
          <div className="rounded-2xl bg-white p-4 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Ausentes</p>
            <p className="mt-1 text-3xl font-bold text-red-500">{absenceCount}</p>
          </div>
          <div className="rounded-2xl bg-white p-4 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Pendentes</p>
            <p className="mt-1 text-3xl font-bold text-yellow-500">{pendingCount}</p>
          </div>
        </div>
      )}

      {/* Filtro de status */}
      {!loading && visible.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {['all', 'agendada', 'confirmada', 'realizada'].map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={cn(
                'rounded-lg px-3 py-1.5 text-xs font-medium transition-all',
                statusFilter === s
                  ? 'bg-brand-600 text-white'
                  : 'bg-white text-gray-500 hover:bg-gray-50 shadow-sm',
              )}
            >
              {s === 'all' ? 'Todas' : STATUS_LABEL[s]}
            </button>
          ))}
        </div>
      )}

      {/* Lista de sessões */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-28 animate-pulse rounded-2xl bg-gray-200" />
          ))}
        </div>
      ) : visible.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl bg-white py-16 shadow-sm">
          <p className="text-4xl">📋</p>
          <p className="mt-3 font-medium text-gray-500">Nenhuma sessão para este dia</p>
          <p className="mt-1 text-sm text-gray-400">Agende sessões na aba Agendamento</p>
        </div>
      ) : (
        <div className="space-y-3">
          {visible.map((session) => {
            const attendance = attendanceMap[session.id];
            const isSaving = saving.has(session.id);
            const hour = new Date(session.scheduledAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

            return (
              <div
                key={session.id}
                className="flex flex-col gap-3 rounded-2xl bg-white p-4 shadow-sm sm:flex-row sm:items-center"
              >
                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold text-gray-900">{session.student.name}</span>
                    <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', STATUS_BADGE[session.status])}>
                      {STATUS_LABEL[session.status]}
                    </span>
                  </div>
                  <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-gray-500">
                    <span>⏰ {hour}</span>
                    <span>📚 {session.subject.name}</span>
                    <span>👤 {session.teacher.name}</span>
                    {session.room && <span>🚪 {session.room.name}</span>}
                  </div>
                </div>

                {/* Botões de presença */}
                <div className="flex shrink-0 gap-1.5">
                  {STATUSES.map((s) => {
                    const isActive = attendance?.status === s;
                    return (
                      <button
                        key={s}
                        disabled={isSaving}
                        onClick={() => recordAttendance(session, s)}
                        className={cn(
                          'rounded-lg border px-3 py-1.5 text-xs font-medium transition-all disabled:opacity-50',
                          isActive ? ATTENDANCE_BTN[s] : ATTENDANCE_IDLE[s],
                        )}
                      >
                        {LABELS[s]}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
