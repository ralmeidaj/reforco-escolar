'use client';

import { useState, useEffect } from 'react';
import { api } from '@/app/lib/api';
import { cn } from '@/app/lib/utils';

interface Room { id: string; name: string }
interface ReportRow {
  id: string;
  status: 'presente' | 'ausente' | 'justificado';
  student: { id: string; name: string };
  session: {
    scheduledAt: string;
    subject?: { id: string; name: string } | null;
    teacher?: { id: string; name: string } | null;
    room?: { id: string; name: string } | null;
  };
}

const STATUS_LABEL: Record<string, string> = {
  presente: 'Presente', ausente: 'Ausente', justificado: 'Justificado',
};
const STATUS_BADGE: Record<string, string> = {
  presente: 'bg-green-100 text-green-700',
  ausente: 'bg-red-100 text-red-600',
  justificado: 'bg-yellow-100 text-yellow-700',
};

function isoDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

export default function AttendanceReportPage() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [from, setFrom] = useState(() => isoDate(startOfMonth(new Date())));
  const [to, setTo] = useState(() => isoDate(new Date()));
  const [roomId, setRoomId] = useState('');
  const [rows, setRows] = useState<ReportRow[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingRooms, setLoadingRooms] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get<Room[]>('/rooms')
      .then(({ data }) => setRooms(data))
      .catch(() => {})
      .finally(() => setLoadingRooms(false));
  }, []);

  async function generateReport() {
    setError('');
    setLoading(true);
    try {
      const fromIso = `${from}T00:00:00`;
      const toIso = `${to}T23:59:59`;
      const params = new URLSearchParams({ from: fromIso, to: toIso });
      if (roomId) params.set('roomId', roomId);
      const { data } = await api.get<ReportRow[]>(`/attendances/report?${params.toString()}`);
      setRows(data);
    } catch (err: any) {
      setError(err.response?.data?.message ?? 'Erro ao gerar relatório');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { generateReport(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const summary = (rows ?? []).reduce(
    (acc, r) => { acc[r.status] = (acc[r.status] ?? 0) + 1; return acc; },
    {} as Record<string, number>,
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Relatório de Presença</h1>
        <p className="mt-1 text-sm text-gray-500">Presença dos alunos por período e sala</p>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap items-end gap-3 rounded-2xl bg-white p-4 shadow-sm">
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-500">De</label>
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-500">Até</label>
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-500">Sala</label>
          <select
            disabled={loadingRooms}
            value={roomId}
            onChange={(e) => setRoomId(e.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 disabled:opacity-60"
          >
            <option value="">Todas as salas</option>
            {rooms.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
        </div>
        <button
          onClick={generateReport}
          disabled={loading}
          className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
        >
          {loading ? 'Gerando...' : 'Gerar relatório'}
        </button>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {/* Resumo */}
      {rows && (
        <div className="grid grid-cols-3 gap-4">
          <div className="rounded-2xl bg-white p-4 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Presentes</p>
            <p className="mt-1 text-3xl font-bold text-green-600">{summary.presente ?? 0}</p>
          </div>
          <div className="rounded-2xl bg-white p-4 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Ausentes</p>
            <p className="mt-1 text-3xl font-bold text-red-500">{summary.ausente ?? 0}</p>
          </div>
          <div className="rounded-2xl bg-white p-4 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Justificados</p>
            <p className="mt-1 text-3xl font-bold text-yellow-500">{summary.justificado ?? 0}</p>
          </div>
        </div>
      )}

      {/* Tabela */}
      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-12 animate-pulse rounded-xl bg-gray-100" />)}
        </div>
      ) : !rows || rows.length === 0 ? (
        <div className="rounded-2xl bg-white py-16 text-center shadow-sm">
          <p className="text-sm text-gray-400">Nenhum registro de presença no período selecionado.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left text-xs font-medium uppercase tracking-wide text-gray-400">
                <th className="px-4 py-3">Data</th>
                <th className="px-4 py-3">Sala</th>
                <th className="px-4 py-3">Aluno</th>
                <th className="px-4 py-3">Disciplina</th>
                <th className="px-4 py-3">Professor</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {rows.map((r) => (
                <tr key={r.id} className="hover:bg-gray-50">
                  <td className="whitespace-nowrap px-4 py-3 text-gray-600">
                    {new Date(r.session.scheduledAt).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                    {' '}
                    {new Date(r.session.scheduledAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{r.session.room?.name ?? '—'}</td>
                  <td className="px-4 py-3 font-medium text-gray-900">{r.student.name}</td>
                  <td className="px-4 py-3 text-gray-600">{r.session.subject?.name ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-600">{r.session.teacher?.name ?? '—'}</td>
                  <td className="px-4 py-3">
                    <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', STATUS_BADGE[r.status])}>
                      {STATUS_LABEL[r.status]}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
