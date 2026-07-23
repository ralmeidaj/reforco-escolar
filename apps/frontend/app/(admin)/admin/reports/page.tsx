'use client';

import { useState, useEffect } from 'react';
import { api } from '@/app/lib/api';

interface AdminKpis {
  totalStudents: number;
  activeStudents: number;
  totalTeachers: number;
  sessionsThisMonth: number;
  attendanceRate: number;
  revenueThisMonth: number;
  pendingPayments: number;
}

interface StudentReport {
  student: { id: string; name: string };
  totalSessions: number;
  attendedSessions: number;
  attendanceRate: number;
  pendingTasks: number;
  completedTasks: number;
  currentLevel: string | null;
}

function KpiCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wide text-gray-400">{label}</p>
      <p className="mt-1 text-3xl font-bold text-gray-900">{value}</p>
      {sub && <p className="mt-0.5 text-xs text-gray-400">{sub}</p>}
    </div>
  );
}

function SkeletonCard() {
  return <div className="h-24 animate-pulse rounded-2xl bg-gray-200" />;
}

export default function AdminReportsPage() {
  const [kpis, setKpis] = useState<AdminKpis | null>(null);
  const [students, setStudents] = useState<StudentReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get<AdminKpis>('/reports/admin/kpis')
      .then(({ data }) => setKpis(data))
      .catch(() => setError('Erro ao carregar KPIs'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    setLoadingStudents(true);
    api.get<{ id: string; name: string }[]>('/auth/users?role=student')
      .then(async ({ data }) => {
        const reports = await Promise.all(
          data.slice(0, 20).map((s) =>
            api.get<StudentReport>(`/reports/student/${s.id}`)
              .then((r) => r.data)
              .catch(() => null),
          ),
        );
        setStudents(reports.filter(Boolean) as StudentReport[]);
      })
      .catch(() => {})
      .finally(() => setLoadingStudents(false));
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Relatórios</h1>
        <p className="mt-1 text-sm text-gray-500">Visão geral do desempenho da escola</p>
      </div>

      {error && (
        <div className="rounded-xl bg-red-50 p-4 text-sm text-red-600">{error}</div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {loading ? (
          Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)
        ) : kpis ? (
          <>
            <KpiCard label="Alunos ativos" value={kpis.activeStudents} sub={`de ${kpis.totalStudents} total`} />
            <KpiCard label="Professores" value={kpis.totalTeachers} />
            <KpiCard label="Aulas este mês" value={kpis.sessionsThisMonth} />
            <KpiCard label="Taxa de presença" value={`${kpis.attendanceRate ?? 0}%`} />
            <KpiCard label="Receita este mês" value={`R$ ${Number(kpis.revenueThisMonth ?? 0).toFixed(2)}`} />
            <KpiCard label="Pagamentos pendentes" value={kpis.pendingPayments ?? 0} />
          </>
        ) : null}
      </div>

      {/* Relatório por aluno */}
      <div>
        <h2 className="mb-3 text-base font-semibold text-gray-800">Desempenho por aluno</h2>

        {loadingStudents ? (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-16 animate-pulse rounded-xl bg-gray-200" />
            ))}
          </div>
        ) : students.length === 0 ? (
          <div className="rounded-xl bg-white py-12 text-center text-gray-400 shadow-sm">
            Nenhum aluno cadastrado ainda.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl bg-white shadow-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left text-xs font-medium uppercase tracking-wide text-gray-400">
                  <th className="px-4 py-3">Aluno</th>
                  <th className="px-4 py-3">Aulas</th>
                  <th className="px-4 py-3">Presença</th>
                  <th className="px-4 py-3">Tarefas</th>
                  <th className="px-4 py-3">Nível</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {students.map((s) => (
                  <tr key={s.student.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{s.student.name}</td>
                    <td className="px-4 py-3 text-gray-600">{s.attendedSessions}/{s.totalSessions}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        s.attendanceRate >= 75 ? 'bg-green-100 text-green-700' :
                        s.attendanceRate >= 50 ? 'bg-yellow-100 text-yellow-700' :
                        'bg-red-100 text-red-600'
                      }`}>
                        {s.attendanceRate ?? 0}%
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {s.completedTasks}/{s.completedTasks + s.pendingTasks} concluídas
                    </td>
                    <td className="px-4 py-3 text-gray-500 capitalize">{s.currentLevel ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
