'use client';

import { useState, useEffect } from 'react';
import { api } from '@/app/lib/api';

interface TeacherReport {
  totalSessions: number;
  completedSessions: number;
  studentCount: number;
  pendingTasks: number;
}

interface Session {
  id: string;
  scheduledAt: string;
  status: string;
  student?: { name: string };
  subject?: { name: string };
  channel: string;
}

const STATUS_LABELS: Record<string, string> = {
  agendada: 'Agendada', confirmada: 'Confirmada', realizada: 'Realizada', cancelada: 'Cancelada',
};
const STATUS_COLORS: Record<string, string> = {
  agendada: 'bg-blue-100 text-blue-700',
  confirmada: 'bg-emerald-100 text-emerald-700',
  realizada: 'bg-gray-100 text-gray-600',
  cancelada: 'bg-red-100 text-red-600',
};

export default function TeacherDashboard() {
  const [report, setReport] = useState<TeacherReport | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const today = new Date();
    const from = today.toISOString().split('T')[0];
    const to = from;
    Promise.all([
      api.get<TeacherReport>('/reports/teacher/me'),
      api.get<Session[]>(`/sessions?from=${from}T00:00:00&to=${to}T23:59:59`),
    ])
      .then(([r, s]) => { setReport(r.data); setSessions(s.data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Painel do Professor</h1>
        <p className="mt-1 text-sm text-gray-500">Suas aulas e alunos de hoje</p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {loading ? (
          [...Array(4)].map((_, i) => <div key={i} className="h-24 animate-pulse rounded-2xl bg-gray-100" />)
        ) : report ? (
          [
            { label: 'Aulas realizadas',  value: report.completedSessions, color: 'text-brand-600' },
            { label: 'Total de aulas',     value: report.totalSessions,     color: 'text-gray-900' },
            { label: 'Alunos vinculados',  value: report.studentCount,      color: 'text-emerald-600' },
            { label: 'Tarefas pendentes',  value: report.pendingTasks,      color: report.pendingTasks > 0 ? 'text-amber-600' : 'text-gray-900' },
          ].map((c) => (
            <div key={c.label} className="rounded-2xl bg-white p-5 shadow-sm">
              <p className="text-xs font-medium text-gray-500">{c.label}</p>
              <p className={`mt-2 text-2xl font-bold ${c.color}`}>{c.value}</p>
            </div>
          ))
        ) : null}
      </div>

      <div className="rounded-2xl bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-sm font-semibold text-gray-700">Aulas de hoje</h2>
        {loading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => <div key={i} className="h-14 animate-pulse rounded-xl bg-gray-100" />)}
          </div>
        ) : sessions.length === 0 ? (
          <p className="text-sm text-gray-400">Nenhuma aula agendada para hoje.</p>
        ) : (
          <div className="space-y-3">
            {sessions.map((s) => (
              <div key={s.id} className="flex items-center justify-between rounded-xl bg-gray-50 px-4 py-3">
                <div>
                  <p className="text-sm font-semibold text-gray-800">{s.student?.name ?? '—'}</p>
                  <p className="text-xs text-gray-500">
                    {s.subject?.name ?? '—'} · {new Date(s.scheduledAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} · {s.channel}
                  </p>
                </div>
                <span className={`rounded-full px-3 py-1 text-xs font-medium ${STATUS_COLORS[s.status] ?? 'bg-gray-100 text-gray-600'}`}>
                  {STATUS_LABELS[s.status] ?? s.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
