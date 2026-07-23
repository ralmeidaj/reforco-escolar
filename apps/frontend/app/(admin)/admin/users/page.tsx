'use client';

import { useState, useEffect } from 'react';
import { api } from '@/app/lib/api';
import { Spinner } from '@/app/components/Spinner';
import { cn } from '@/app/lib/utils';

interface User { id: string; name: string; email: string; role: string }
interface Subject { id: string; name: string; color: string }

type Tab = 'teachers' | 'students' | 'guardians';

const TAB_ROLES: Record<Tab, string> = {
  teachers: 'teacher',
  students: 'student',
  guardians: 'guardian',
};

const TAB_LABELS: Record<Tab, string> = {
  teachers: 'Professores',
  students: 'Alunos',
  guardians: 'Responsáveis',
};

export default function UsersPage() {
  const [tab, setTab] = useState<Tab>('teachers');
  const [users, setUsers] = useState<User[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal de vínculo professor ↔ disciplina
  const [linkModal, setLinkModal] = useState<{ teacher: User } | null>(null);
  const [selectedSubject, setSelectedSubject] = useState('');
  const [linking, setLinking] = useState(false);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.get<User[]>(`/auth/users?role=${TAB_ROLES[tab]}`),
      api.get<Subject[]>('/subjects'),
    ])
      .then(([usersRes, subjectsRes]) => {
        setUsers(usersRes.data);
        setSubjects(subjectsRes.data);
      })
      .finally(() => setLoading(false));
  }, [tab]);

  async function handleLink() {
    if (!linkModal || !selectedSubject) return;
    setLinking(true);
    try {
      await api.post('/teacher-subjects', {
        teacherId: linkModal.teacher.id,
        subjectId: selectedSubject,
      });
      setLinkModal(null);
      setSelectedSubject('');
    } finally {
      setLinking(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Usuários</h1>
        <p className="mt-1 text-sm text-gray-500">Professores, alunos e responsáveis</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-xl bg-gray-100 p-1 w-fit">
        {(['teachers', 'students', 'guardians'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              'rounded-lg px-4 py-1.5 text-sm font-medium transition-all',
              tab === t
                ? 'bg-white text-brand-700 shadow-sm'
                : 'text-gray-500 hover:text-gray-700',
            )}
          >
            {TAB_LABELS[t]}
          </button>
        ))}
      </div>

      <div className="rounded-2xl bg-white shadow-sm">
        {loading ? (
          <div className="flex items-center justify-center p-12">
            <Spinner size="lg" className="text-brand-600" />
          </div>
        ) : users.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-sm text-gray-400">Nenhum {TAB_LABELS[tab].toLowerCase().slice(0,-1)} cadastrado ainda.</p>
            <p className="mt-1 text-xs text-gray-400">Use os convites por e-mail para adicionar usuários.</p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {users.map((u) => (
              <li key={u.id} className="flex items-center justify-between px-5 py-3">
                <div>
                  <p className="text-sm font-medium text-gray-900">{u.name}</p>
                  <p className="text-xs text-gray-500">{u.email}</p>
                </div>
                {tab === 'teachers' && (
                  <button
                    onClick={() => setLinkModal({ teacher: u })}
                    className="rounded-lg border border-brand-200 px-3 py-1 text-xs font-medium text-brand-600 hover:bg-brand-50"
                  >
                    Vincular disciplina
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Modal de vínculo */}
      {linkModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="text-base font-semibold text-gray-900">
              Vincular disciplina — {linkModal.teacher.name}
            </h3>
            <select
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
              className="mt-4 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            >
              <option value="">Selecione uma disciplina</option>
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => setLinkModal(null)}
                className="rounded-lg px-4 py-2 text-sm text-gray-500 hover:bg-gray-100"
              >
                Cancelar
              </button>
              <button
                onClick={handleLink}
                disabled={!selectedSubject || linking}
                className="flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {linking ? <><Spinner size="sm" className="text-white" /> Vinculando...</> : 'Vincular'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
