'use client';

import { useState, useEffect } from 'react';
import { api } from '@/app/lib/api';

interface GuardianReport {
  student: { id: string; name: string };
  attendanceRate: number;
  totalSessions: number;
  presentCount: number;
  pendingTasks: number;
  lessonsRemaining: number;
  progressBySubject: { subjectName: string; level: string }[];
}

interface Student { id: string; name: string }

const LEVEL_COLORS: Record<string, string> = {
  iniciante: 'bg-gray-100 text-gray-600',
  basico: 'bg-blue-100 text-blue-700',
  intermediario: 'bg-amber-100 text-amber-700',
  avancado: 'bg-emerald-100 text-emerald-700',
};

const LEVEL_LABELS: Record<string, string> = {
  iniciante: 'Iniciante', basico: 'Básico', intermediario: 'Intermediário', avancado: 'Avançado',
};

export default function GuardianDashboard() {
  const [students, setStudents] = useState<Student[]>([]);
  const [selected, setSelected] = useState('');
  const [report, setReport] = useState<GuardianReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingReport, setLoadingReport] = useState(false);

  useEffect(() => {
    api.get<Student[]>('/guardian/students')
      .then(({ data }) => { setStudents(data); if (data.length > 0) setSelected(data[0].id); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!selected) return;
    setLoadingReport(true);
    api.get<GuardianReport>(`/reports/guardian/student/${selected}`)
      .then(({ data }) => setReport(data))
      .catch(() => {})
      .finally(() => setLoadingReport(false));
  }, [selected]);

  if (loading) return (
    <div className="space-y-4">
      {[...Array(4)].map((_, i) => <div key={i} className="h-20 animate-pulse rounded-2xl bg-gray-100" />)}
    </div>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Acompanhamento</h1>
        <p className="mt-1 text-sm text-gray-500">Progresso e agenda do seu filho</p>
      </div>

      {students.length > 1 && (
        <div className="rounded-2xl bg-white p-4 shadow-sm">
          <select value={selected} onChange={(e) => setSelected(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-600">
            {students.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
      )}

      {loadingReport ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[...Array(4)].map((_, i) => <div key={i} className="h-24 animate-pulse rounded-2xl bg-gray-100" />)}
        </div>
      ) : report && (
        <>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {[
              { label: 'Frequência',        value: `${report.attendanceRate}%`, color: report.attendanceRate >= 75 ? 'text-emerald-600' : 'text-amber-600' },
              { label: 'Aulas realizadas',  value: report.presentCount,         color: 'text-brand-600' },
              { label: 'Tarefas pendentes', value: report.pendingTasks,         color: report.pendingTasks > 0 ? 'text-amber-600' : 'text-gray-900' },
              { label: 'Aulas restantes',   value: report.lessonsRemaining,     color: report.lessonsRemaining <= 2 ? 'text-red-500' : 'text-gray-900' },
            ].map((c) => (
              <div key={c.label} className="rounded-2xl bg-white p-4 shadow-sm">
                <p className="text-xs font-medium text-gray-500">{c.label}</p>
                <p className={`mt-1 text-2xl font-bold ${c.color}`}>{c.value}</p>
              </div>
            ))}
          </div>

          {report.lessonsRemaining <= 2 && (
            <div className="rounded-2xl bg-amber-50 border border-amber-200 p-4">
              <p className="text-sm text-amber-700">
                Atenção: seu filho tem apenas <strong>{report.lessonsRemaining}</strong> aula{report.lessonsRemaining !== 1 ? 's' : ''} restante{report.lessonsRemaining !== 1 ? 's' : ''}. Entre em contato para renovar o pacote.
              </p>
            </div>
          )}

          {report.progressBySubject.length > 0 && (
            <div className="rounded-2xl bg-white p-5 shadow-sm space-y-3">
              <h2 className="text-sm font-semibold text-gray-700">Nível por disciplina</h2>
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
        </>
      )}
    </div>
  );
}
