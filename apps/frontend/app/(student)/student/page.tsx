'use client';

import { useState, useEffect } from 'react';
import { api } from '@/app/lib/api';

interface StudentReport {
  attendanceRate: number;
  totalSessions: number;
  presentCount: number;
  pendingTasks: number;
  doneTasks: number;
  studyLogCount: number;
  progressBySubject: { subjectName: string; level: string }[];
}

const LEVEL_COLORS: Record<string, string> = {
  iniciante: 'bg-gray-100 text-gray-600',
  basico: 'bg-blue-100 text-blue-700',
  intermediario: 'bg-amber-100 text-amber-700',
  avancado: 'bg-emerald-100 text-emerald-700',
};

const LEVEL_LABELS: Record<string, string> = {
  iniciante: 'Iniciante',
  basico: 'Básico',
  intermediario: 'Intermediário',
  avancado: 'Avançado',
};

export default function StudentDashboard() {
  const [report, setReport] = useState<StudentReport | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<StudentReport>('/reports/student/me')
      .then(({ data }) => setReport(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Meu Painel</h1>
        <p className="mt-1 text-sm text-gray-500">Suas aulas, tarefas e progresso</p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        {loading ? (
          [...Array(3)].map((_, i) => <div key={i} className="h-24 animate-pulse rounded-2xl bg-gray-100" />)
        ) : report ? (
          [
            { label: 'Frequência',        value: `${report.attendanceRate}%`,  color: report.attendanceRate >= 75 ? 'text-emerald-600' : 'text-amber-600' },
            { label: 'Tarefas pendentes', value: report.pendingTasks,          color: report.pendingTasks > 0 ? 'text-amber-600' : 'text-emerald-600' },
            { label: 'Registros de estudo', value: report.studyLogCount,       color: 'text-brand-600' },
          ].map((c) => (
            <div key={c.label} className="rounded-2xl bg-white p-5 shadow-sm">
              <p className="text-xs font-medium text-gray-500">{c.label}</p>
              <p className={`mt-2 text-2xl font-bold ${c.color}`}>{c.value}</p>
            </div>
          ))
        ) : null}
      </div>

      {!loading && report && report.progressBySubject.length > 0 && (
        <div className="rounded-2xl bg-white p-5 shadow-sm space-y-3">
          <h2 className="text-sm font-semibold text-gray-700">Meu nível por disciplina</h2>
          {report.progressBySubject.map((p) => (
            <div key={p.subjectName} className="flex items-center justify-between">
              <span className="text-sm text-gray-700">{p.subjectName}</span>
              <span className={`rounded-full px-3 py-1 text-xs font-medium ${LEVEL_COLORS[p.level] ?? 'bg-gray-100 text-gray-600'}`}>
                {LEVEL_LABELS[p.level] ?? p.level}
              </span>
            </div>
          ))}
        </div>
      )}

      {!loading && report && report.pendingTasks > 0 && (
        <div className="rounded-2xl bg-amber-50 border border-amber-200 p-4">
          <p className="text-sm text-amber-700">
            Você tem <strong>{report.pendingTasks}</strong> tarefa{report.pendingTasks > 1 ? 's' : ''} pendente{report.pendingTasks > 1 ? 's' : ''}. Acesse <strong>Tarefas</strong> para ver os detalhes.
          </p>
        </div>
      )}
    </div>
  );
}
