'use client';

import { useState, useEffect } from 'react';
import { api } from '@/app/lib/api';

interface Attendance {
  id: string;
  status: 'presente' | 'ausente' | 'justificado';
  createdAt: string;
  session?: { scheduledAt: string; subject?: { name: string } };
}

interface Student { id: string; name: string }

const STATUS_LABELS: Record<string, string> = {
  presente: 'Presente',
  ausente: 'Ausente',
  justificado: 'Justificado',
};

const STATUS_COLORS: Record<string, string> = {
  presente: 'bg-emerald-100 text-emerald-700',
  ausente: 'bg-red-100 text-red-700',
  justificado: 'bg-amber-100 text-amber-700',
};

export default function GuardianAttendancePage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<string>('');
  const [attendances, setAttendances] = useState<Attendance[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingAttendances, setLoadingAttendances] = useState(false);

  useEffect(() => {
    api
      .get<Student[]>('/guardian/students')
      .then(({ data }) => {
        setStudents(data);
        if (data.length > 0) setSelectedStudent(data[0].id);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!selectedStudent) return;
    setLoadingAttendances(true);
    api
      .get<Attendance[]>(`/attendances/student/${selectedStudent}`)
      .then(({ data }) => setAttendances(data))
      .finally(() => setLoadingAttendances(false));
  }, [selectedStudent]);

  const absenceCount = attendances.filter((a) => a.status === 'ausente').length;
  const totalCount = attendances.length;

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 animate-pulse rounded bg-gray-200" />
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-14 animate-pulse rounded-2xl bg-gray-100" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Frequência</h1>
        <p className="mt-1 text-sm text-gray-500">Acompanhe a presença do seu filho nas aulas</p>
      </div>

      {students.length > 1 && (
        <div className="rounded-2xl bg-white p-4 shadow-sm">
          <label className="block text-sm font-medium text-gray-700 mb-1">Aluno</label>
          <select
            value={selectedStudent}
            onChange={(e) => setSelectedStudent(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-600"
          >
            {students.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
      )}

      {selectedStudent && (
        <>
          <div className="grid grid-cols-3 gap-4">
            <div className="rounded-2xl bg-white p-4 shadow-sm text-center">
              <p className="text-xs text-gray-500">Total de aulas</p>
              <p className="mt-1 text-2xl font-bold text-gray-900">{totalCount}</p>
            </div>
            <div className="rounded-2xl bg-white p-4 shadow-sm text-center">
              <p className="text-xs text-gray-500">Faltas</p>
              <p className="mt-1 text-2xl font-bold text-red-600">{absenceCount}</p>
            </div>
            <div className="rounded-2xl bg-white p-4 shadow-sm text-center">
              <p className="text-xs text-gray-500">Frequência</p>
              <p className="mt-1 text-2xl font-bold text-emerald-600">
                {totalCount > 0 ? Math.round(((totalCount - absenceCount) / totalCount) * 100) : 0}%
              </p>
            </div>
          </div>

          <div className="space-y-2">
            {loadingAttendances ? (
              [...Array(4)].map((_, i) => (
                <div key={i} className="h-14 animate-pulse rounded-2xl bg-gray-100" />
              ))
            ) : attendances.length === 0 ? (
              <div className="rounded-2xl bg-white p-5 shadow-sm">
                <p className="text-sm text-gray-400">Nenhum registro de presença ainda.</p>
              </div>
            ) : (
              attendances.map((a) => (
                <div key={a.id} className="rounded-2xl bg-white p-4 shadow-sm flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {a.session?.subject?.name ?? 'Aula'}
                    </p>
                    <p className="text-xs text-gray-500">
                      {a.session?.scheduledAt
                        ? new Date(a.session.scheduledAt).toLocaleDateString('pt-BR', {
                            day: '2-digit', month: 'short', year: 'numeric',
                            hour: '2-digit', minute: '2-digit',
                          })
                        : new Date(a.createdAt).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-xs font-medium ${STATUS_COLORS[a.status]}`}>
                    {STATUS_LABELS[a.status]}
                  </span>
                </div>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}
