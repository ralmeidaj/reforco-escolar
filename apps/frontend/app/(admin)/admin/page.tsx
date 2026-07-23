'use client';

import { useState, useEffect } from 'react';
import { api } from '@/app/lib/api';

interface AdminKpis {
  activeStudents: number;
  activeTeachers: number;
  totalSessions: number;
  completedSessions: number;
  revenueTotal: number;
  totalAbsences: number;
  attendanceRate: number;
}

function KpiSkeleton() {
  return <div className="h-24 animate-pulse rounded-2xl bg-gray-100" />;
}

export default function AdminDashboard() {
  const [kpis, setKpis] = useState<AdminKpis | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<AdminKpis>('/reports/admin/kpis')
      .then(({ data }) => setKpis(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const cards = kpis ? [
    { label: 'Alunos ativos',      value: kpis.activeStudents,                          color: 'text-gray-900' },
    { label: 'Professores ativos', value: kpis.activeTeachers,                          color: 'text-gray-900' },
    { label: 'Aulas realizadas',   value: kpis.completedSessions,                       color: 'text-brand-600' },
    { label: 'Frequência geral',   value: `${kpis.attendanceRate}%`,                    color: kpis.attendanceRate >= 80 ? 'text-emerald-600' : 'text-amber-600' },
    { label: 'Faltas registradas', value: kpis.totalAbsences,                           color: 'text-red-500' },
    { label: 'Receita acumulada',  value: `R$ ${Number(kpis.revenueTotal).toFixed(2)}`, color: 'text-emerald-600' },
  ] : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-1 text-sm text-gray-500">Visão geral da escola</p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        {loading
          ? [...Array(6)].map((_, i) => <KpiSkeleton key={i} />)
          : cards.map((c) => (
              <div key={c.label} className="rounded-2xl bg-white p-5 shadow-sm">
                <p className="text-xs font-medium text-gray-500">{c.label}</p>
                <p className={`mt-2 text-2xl font-bold ${c.color}`}>{c.value}</p>
              </div>
            ))}
      </div>

      {!loading && kpis && (
        <div className="rounded-2xl bg-white p-5 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold text-gray-700">Taxa de conclusão de aulas</h2>
          <div className="flex items-center gap-3">
            <div className="flex-1 rounded-full bg-gray-100 h-3 overflow-hidden">
              <div
                className="h-3 rounded-full bg-brand-600 transition-all"
                style={{ width: kpis.totalSessions > 0 ? `${Math.round((kpis.completedSessions / kpis.totalSessions) * 100)}%` : '0%' }}
              />
            </div>
            <span className="text-sm font-medium text-gray-700 shrink-0">
              {kpis.totalSessions > 0 ? Math.round((kpis.completedSessions / kpis.totalSessions) * 100) : 0}%
            </span>
          </div>
          <p className="mt-1 text-xs text-gray-400">{kpis.completedSessions} de {kpis.totalSessions} aulas realizadas</p>
        </div>
      )}
    </div>
  );
}
