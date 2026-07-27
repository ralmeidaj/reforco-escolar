'use client';

import { useState, useEffect } from 'react';
import { api } from '@/app/lib/api';

interface Session {
  id: string;
  scheduledAt: string;
  status: string;
  student?: { id: string; name: string; email: string };
  subject?: { name: string };
}

interface StudentSummary {
  id: string;
  name: string;
  email: string;
  subjects: string[];
  totalSessions: number;
  completedSessions: number;
}

export default function TeacherStudentsPage() {
  const [students, setStudents] = useState<StudentSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<Session[]>('/sessions')
      .then(({ data }) => {
        const map = new Map<string, StudentSummary>();
        data.forEach((s) => {
          if (!s.student) return;
          const { id, name, email } = s.student;
          if (!map.has(id)) map.set(id, { id, name, email, subjects: [], totalSessions: 0, completedSessions: 0 });
          const entry = map.get(id)!;
          entry.totalSessions++;
          if (s.status === 'realizada') entry.completedSessions++;
          if (s.subject?.name && !entry.subjects.includes(s.subject.name)) {
            entry.subjects.push(s.subject.name);
          }
        });
        setStudents(Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name)));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Meus Alunos</h1>
        <p className="mt-1 text-sm text-gray-500">Alunos com quem você tem sessões agendadas</p>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => <div key={i} className="h-20 animate-pulse rounded-2xl bg-gray-100" />)}
        </div>
      ) : students.length === 0 ? (
        <div className="rounded-2xl bg-white p-8 text-center shadow-sm">
          <p className="text-sm text-gray-500">Nenhum aluno vinculado ainda. Alunos aparecem assim que há sessões agendadas com você.</p>
        </div>
      ) : (
        <>
          <div className="rounded-2xl bg-white px-5 py-3 shadow-sm">
            <p className="text-sm text-gray-500"><strong className="text-gray-800">{students.length}</strong> aluno{students.length !== 1 ? 's' : ''}</p>
          </div>
          <div className="space-y-3">
            {students.map((s) => (
              <div key={s.id} className="rounded-2xl bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-800">{s.name}</p>
                    <p className="text-xs text-gray-400">{s.email}</p>
                    {s.subjects.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {s.subjects.map((sub) => (
                          <span key={sub} className="rounded-full bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-700">{sub}</span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="ml-4 shrink-0 text-right">
                    <p className="text-lg font-bold text-brand-600">{s.completedSessions}</p>
                    <p className="text-[11px] text-gray-400">de {s.totalSessions} aulas</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
