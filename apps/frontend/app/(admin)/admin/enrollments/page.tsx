'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/app/lib/api';

interface Student { id: string; name: string; email: string }
interface Subject { id: string; name: string; color: string }
interface Group   { id: string; name: string; level: string }
interface Enrollment {
  id: string;
  subject: Subject;
  group: Group | null;
}

export default function EnrollmentsPage() {
  const [students, setStudents]     = useState<Student[]>([]);
  const [subjects, setSubjects]     = useState<Subject[]>([]);
  const [groups, setGroups]         = useState<Group[]>([]);
  const [enrollMap, setEnrollMap]   = useState<Record<string, Enrollment[]>>({});
  const [loading, setLoading]       = useState(true);
  const [search, setSearch]         = useState('');

  // modal
  const [modalStudent, setModalStudent] = useState<Student | null>(null);
  const [selSubject, setSelSubject]     = useState('');
  const [selGroup, setSelGroup]         = useState('');
  const [saving, setSaving]             = useState(false);
  const [modalError, setModalError]     = useState('');

  const loadEnrollments = useCallback(async (studentList: Student[]) => {
    const results = await Promise.all(
      studentList.map((s) =>
        api.get<Enrollment[]>(`/subjects/enrollments?studentId=${s.id}`)
          .then(({ data }) => ({ id: s.id, data }))
          .catch(() => ({ id: s.id, data: [] }))
      )
    );
    const map: Record<string, Enrollment[]> = {};
    results.forEach(({ id, data }) => { map[id] = data; });
    setEnrollMap(map);
  }, []);

  useEffect(() => {
    Promise.all([
      api.get<Student[]>('/auth/users?role=student'),
      api.get<Subject[]>('/subjects'),
      api.get<Group[]>('/groups'),
    ]).then(([s, sub, g]) => {
      setStudents(s.data);
      setSubjects(sub.data);
      setGroups(g.data);
      return loadEnrollments(s.data);
    }).finally(() => setLoading(false));
  }, [loadEnrollments]);

  async function handleEnroll(e: React.FormEvent) {
    e.preventDefault();
    if (!modalStudent || !selSubject) return;
    setModalError('');
    setSaving(true);
    try {
      await api.post('/subjects/enrollments', {
        studentId: modalStudent.id,
        subjectId: selSubject,
        groupId: selGroup || undefined,
      });
      // recarrega matrículas do aluno
      const { data } = await api.get<Enrollment[]>(`/subjects/enrollments?studentId=${modalStudent.id}`);
      setEnrollMap((prev) => ({ ...prev, [modalStudent.id]: data }));
      setModalStudent(null);
      setSelSubject('');
      setSelGroup('');
    } catch (err: any) {
      setModalError(err.response?.data?.message ?? 'Erro ao matricular');
    } finally {
      setSaving(false);
    }
  }

  async function handleUnenroll(studentId: string, enrollmentId: string) {
    await api.delete(`/subjects/enrollments/${enrollmentId}`).catch(() => {});
    setEnrollMap((prev) => ({
      ...prev,
      [studentId]: (prev[studentId] ?? []).filter((e) => e.id !== enrollmentId),
    }));
  }

  function openModal(student: Student) {
    setModalStudent(student);
    setSelSubject('');
    setSelGroup('');
    setModalError('');
  }

  const filtered = students.filter((s) =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.email.toLowerCase().includes(search.toLowerCase())
  );

  // disciplinas ainda não matriculadas para o aluno selecionado
  const availableSubjects = modalStudent
    ? subjects.filter((sub) =>
        !(enrollMap[modalStudent.id] ?? []).some((e) => e.subject.id === sub.id)
      )
    : subjects;

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Matrículas</h1>
          <p className="mt-1 text-sm text-gray-500">Gerencie as disciplinas e turmas de cada aluno</p>
        </div>
      </div>

      {/* Busca */}
      <input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Buscar aluno por nome ou e-mail..."
        className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm shadow-sm outline-none focus:border-brand-400 focus:ring-1 focus:ring-brand-400"
      />

      {/* Lista */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-20 animate-pulse rounded-2xl bg-gray-100" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl bg-white py-16 text-center text-gray-400 shadow-sm">
          {search ? 'Nenhum aluno encontrado para essa busca.' : 'Nenhum aluno cadastrado ainda.'}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((student) => {
            const enrollments = enrollMap[student.id] ?? [];
            return (
              <div key={student.id} className="rounded-2xl bg-white p-5 shadow-sm">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="font-semibold text-gray-900">{student.name}</p>
                    <p className="text-sm text-gray-400">{student.email}</p>
                  </div>
                  <button
                    onClick={() => openModal(student)}
                    className="shrink-0 rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
                    disabled={availableSubjects.length === 0 && modalStudent?.id === student.id}
                  >
                    + Matricular
                  </button>
                </div>

                {/* Chips de matrícula */}
                {enrollments.length === 0 ? (
                  <p className="mt-3 text-xs text-gray-400">Sem matrículas cadastradas.</p>
                ) : (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {enrollments.map((enr) => (
                      <span
                        key={enr.id}
                        className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700"
                      >
                        <span
                          className="h-2 w-2 rounded-full"
                          style={{ backgroundColor: enr.subject.color || '#3B82F6' }}
                        />
                        {enr.subject.name}
                        {enr.group && (
                          <span className="text-blue-400">· {enr.group.name}</span>
                        )}
                        <button
                          onClick={() => handleUnenroll(student.id, enr.id)}
                          className="ml-0.5 text-blue-400 hover:text-red-500"
                          title="Remover matrícula"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modal de matrícula */}
      {modalStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="mb-1 text-base font-semibold text-gray-900">Matricular aluno</h3>
            <p className="mb-4 text-sm text-gray-500">{modalStudent.name}</p>

            <form onSubmit={handleEnroll} className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">Disciplina</label>
                <select
                  required
                  value={selSubject}
                  onChange={(e) => setSelSubject(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                >
                  <option value="">Selecione...</option>
                  {availableSubjects.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
                {availableSubjects.length === 0 && (
                  <p className="mt-1 text-xs text-amber-500">Aluno já está matriculado em todas as disciplinas.</p>
                )}
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">Turma (opcional)</label>
                <select
                  value={selGroup}
                  onChange={(e) => setSelGroup(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                >
                  <option value="">Sem turma</option>
                  {groups.map((g) => (
                    <option key={g.id} value={g.id}>{g.name} — {g.level}</option>
                  ))}
                </select>
              </div>

              {modalError && (
                <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">{modalError}</p>
              )}

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setModalStudent(null)}
                  className="flex-1 rounded-lg border border-gray-200 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving || !selSubject}
                  className="flex-1 rounded-lg bg-brand-600 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
                >
                  {saving ? 'Salvando...' : 'Matricular'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
