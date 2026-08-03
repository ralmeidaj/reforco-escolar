'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/app/lib/api';
import { cn } from '@/app/lib/utils';

interface Student    { id: string; name: string; email: string }
interface Subject    { id: string; name: string; color: string }
interface Group      { id: string; name: string; level: string }
interface Enrollment { id: string; subject: Subject; group: Group | null }

export default function EnrollmentsPage() {
  const [students, setStudents]   = useState<Student[]>([]);
  const [subjects, setSubjects]   = useState<Subject[]>([]);
  const [groups, setGroups]       = useState<Group[]>([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState('');

  const [selected, setSelected]   = useState<Student | null>(null);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [loadingEnroll, setLoadingEnroll] = useState(false);

  // subjectId → loading state (para feedback individual por checkbox)
  const [busy, setBusy]       = useState<Record<string, boolean>>({});
  const [toggleError, setToggleError] = useState('');

  useEffect(() => {
    Promise.all([
      api.get<Student[]>('/auth/users?role=student'),
      api.get<Subject[]>('/subjects'),
      api.get<Group[]>('/groups'),
    ]).then(([s, sub, g]) => {
      setStudents(s.data);
      setSubjects(sub.data);
      setGroups(g.data);
    }).finally(() => setLoading(false));
  }, []);

  const loadEnrollments = useCallback(async (student: Student) => {
    setLoadingEnroll(true);
    setEnrollments([]);
    try {
      const { data } = await api.get<Enrollment[]>(`/subjects/enrollments?studentId=${student.id}`);
      setEnrollments(data);
    } finally {
      setLoadingEnroll(false);
    }
  }, []);

  function selectStudent(student: Student) {
    setSelected(student);
    loadEnrollments(student);
  }

  async function reloadEnrollments(studentId: string) {
    const { data } = await api.get<Enrollment[]>(`/subjects/enrollments?studentId=${studentId}`);
    setEnrollments(data);
  }

  async function toggleEnrollment(subject: Subject) {
    if (!selected) return;
    setToggleError('');
    setBusy((b) => ({ ...b, [subject.id]: true }));
    try {
      const existing = enrollments.find((e) => e.subject.id === subject.id);
      if (existing) {
        await api.delete(`/subjects/enrollments/${existing.id}`);
      } else {
        await api.post('/subjects/enrollments', {
          studentId: selected.id,
          subjectId: subject.id,
        });
      }
      await reloadEnrollments(selected.id);
    } catch (err: any) {
      setToggleError(err.response?.data?.message ?? err.message ?? 'Erro ao atualizar matrícula');
    } finally {
      setBusy((b) => ({ ...b, [subject.id]: false }));
    }
  }

  async function changeGroup(enrollment: Enrollment, groupId: string) {
    if (!selected) return;
    setBusy((b) => ({ ...b, [enrollment.subject.id]: true }));
    try {
      await api.delete(`/subjects/enrollments/${enrollment.id}`);
      await api.post('/subjects/enrollments', {
        studentId: selected.id,
        subjectId: enrollment.subject.id,
        groupId: groupId || undefined,
      });
      await reloadEnrollments(selected.id);
    } finally {
      setBusy((b) => ({ ...b, [enrollment.subject.id]: false }));
    }
  }

  const filtered = students.filter((s) =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.email.toLowerCase().includes(search.toLowerCase())
  );

  const enrolledCount = selected
    ? enrollments.length
    : 0;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Matrículas</h1>
        <p className="mt-1 text-sm text-gray-500">Selecione um aluno e marque as disciplinas em que ele está matriculado</p>
      </div>

      <div className="flex gap-4" style={{ minHeight: '70vh' }}>
        {/* Painel esquerdo — lista de alunos */}
        <div className="flex w-72 shrink-0 flex-col rounded-2xl bg-white shadow-sm">
          <div className="border-b border-gray-100 p-3">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar aluno..."
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-brand-400 focus:ring-1 focus:ring-brand-400"
            />
          </div>

          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="space-y-2 p-3">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-12 animate-pulse rounded-xl bg-gray-100" />
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <p className="p-4 text-center text-sm text-gray-400">
                {search ? 'Nenhum aluno encontrado.' : 'Nenhum aluno cadastrado.'}
              </p>
            ) : (
              filtered.map((student) => (
                <button
                  key={student.id}
                  onClick={() => selectStudent(student)}
                  className={cn(
                    'flex w-full flex-col items-start border-b border-gray-50 px-4 py-3 text-left transition-colors hover:bg-brand-50',
                    selected?.id === student.id && 'bg-brand-50 border-l-4 border-l-brand-600',
                  )}
                >
                  <span className="text-sm font-medium text-gray-900">{student.name}</span>
                  <span className="text-xs text-gray-400">{student.email}</span>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Painel direito — disciplinas com checkboxes */}
        <div className="flex-1 rounded-2xl bg-white shadow-sm">
          {!selected ? (
            <div className="flex h-full items-center justify-center text-gray-400">
              <div className="text-center">
                <div className="text-4xl">👈</div>
                <p className="mt-2 text-sm">Selecione um aluno para gerenciar as matrículas</p>
              </div>
            </div>
          ) : (
            <div className="p-6">
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <h2 className="text-base font-semibold text-gray-900">{selected.name}</h2>
                  <p className="text-sm text-gray-400">{selected.email}</p>
                </div>
                <span className="rounded-full bg-brand-100 px-3 py-1 text-xs font-semibold text-brand-700">
                  {enrolledCount} {enrolledCount === 1 ? 'disciplina' : 'disciplinas'} matriculada{enrolledCount !== 1 ? 's' : ''}
                </span>
              </div>

              {toggleError && (
                <div className="mb-4 rounded-lg bg-red-50 px-4 py-2.5 text-sm text-red-600">
                  {toggleError}
                </div>
              )}

              {loadingEnroll ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-14 animate-pulse rounded-xl bg-gray-100" />
                  ))}
                </div>
              ) : subjects.length === 0 ? (
                <p className="text-sm text-gray-400">Nenhuma disciplina cadastrada. Crie disciplinas primeiro.</p>
              ) : (
                <div className="space-y-2">
                  {subjects.map((subject) => {
                    const enrollment = enrollments.find((e) => e.subject.id === subject.id);
                    const isEnrolled = !!enrollment;
                    const isBusy    = busy[subject.id] ?? false;

                    return (
                      <div
                        key={subject.id}
                        className={cn(
                          'flex items-center gap-4 rounded-xl border px-4 py-3 transition-colors',
                          isEnrolled ? 'border-brand-200 bg-brand-50' : 'border-gray-100 bg-gray-50 hover:border-gray-200',
                        )}
                      >
                        {/* Checkbox */}
                        <label className="flex cursor-pointer items-center gap-3 flex-1">
                          <input
                            type="checkbox"
                            checked={isEnrolled}
                            disabled={isBusy}
                            onChange={() => toggleEnrollment(subject)}
                            className="h-4 w-4 cursor-pointer rounded accent-brand-600 disabled:cursor-not-allowed"
                          />
                          <span
                            className="h-3 w-3 shrink-0 rounded-full"
                            style={{ backgroundColor: subject.color || '#3B82F6' }}
                          />
                          <span className={cn('text-sm font-medium', isEnrolled ? 'text-brand-800' : 'text-gray-600')}>
                            {subject.name}
                          </span>
                          {isBusy && (
                            <span className="ml-1 h-3.5 w-3.5 animate-spin rounded-full border-2 border-brand-300 border-t-brand-600" />
                          )}
                        </label>

                        {/* Seletor de turma — só aparece se matriculado */}
                        {isEnrolled && (
                          <select
                            value={enrollment.group?.id ?? ''}
                            disabled={isBusy}
                            onChange={(e) => changeGroup(enrollment, e.target.value)}
                            className="rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-xs text-gray-600 focus:border-brand-400 focus:outline-none disabled:opacity-60"
                          >
                            <option value="">Sem turma</option>
                            {groups.map((g) => (
                              <option key={g.id} value={g.id}>{g.name} — {g.level}</option>
                            ))}
                          </select>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
