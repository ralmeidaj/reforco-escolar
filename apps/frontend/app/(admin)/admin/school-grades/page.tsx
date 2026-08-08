'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/app/lib/api';
import { cn } from '@/app/lib/utils';

interface Student { id: string; name: string; email: string }
interface Grade   { id: string; subject: string; value: number; createdAt: string }

export default function SchoolGradesPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState('');

  const [selected, setSelected] = useState<Student | null>(null);
  const [grades, setGrades]     = useState<Grade[]>([]);
  const [loadingGrades, setLoadingGrades] = useState(false);

  const [subject, setSubject] = useState('');
  const [value, setValue]     = useState('');
  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [mobileView, setMobileView] = useState<'list' | 'grades'>('list');

  useEffect(() => {
    api.get<Student[]>('/auth/users?role=student')
      .then(({ data }) => setStudents(data))
      .finally(() => setLoading(false));
  }, []);

  const loadGrades = useCallback(async (studentId: string) => {
    setLoadingGrades(true);
    try {
      const { data } = await api.get<Grade[]>(`/progress/grades/student/${studentId}`);
      setGrades(data);
    } finally {
      setLoadingGrades(false);
    }
  }, []);

  function selectStudent(student: Student) {
    setSelected(student);
    setError('');
    loadGrades(student.id);
    setMobileView('grades');
  }

  async function addGrade() {
    if (!selected || !subject.trim() || !value.trim()) {
      setError('Preencha disciplina e nota');
      return;
    }
    const num = Number(value.replace(',', '.'));
    if (Number.isNaN(num)) {
      setError('Nota inválida');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await api.post('/progress/grades', { studentId: selected.id, subject: subject.trim(), value: num });
      setSubject(''); setValue('');
      await loadGrades(selected.id);
    } catch (err: any) {
      setError(err.response?.data?.message ?? 'Erro ao registrar nota');
    } finally {
      setSaving(false);
    }
  }

  async function removeGrade(id: string) {
    if (!selected || !confirm('Excluir esta nota?')) return;
    setDeletingId(id);
    try {
      await api.delete(`/progress/grades/${id}`);
      await loadGrades(selected.id);
    } finally {
      setDeletingId(null);
    }
  }

  const filtered = students.filter((s) =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Notas da escola</h1>
        <p className="mt-1 text-sm text-gray-500">Registre as notas que o aluno tirou na escola regular (não confundir com atividades do reforço)</p>
      </div>

      <div className="flex flex-col gap-4 lg:flex-row" style={{ minHeight: '70vh' }}>
        {/* Painel esquerdo — lista de alunos */}
        <div className={`flex flex-col rounded-2xl bg-white shadow-sm lg:w-72 lg:shrink-0 ${mobileView === 'grades' ? 'hidden lg:flex' : 'flex'}`}>
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

        {/* Painel direito — formulário + lista de notas */}
        <div className={`flex-1 rounded-2xl bg-white shadow-sm ${mobileView === 'list' ? 'hidden lg:block' : 'block'}`}>
          {!selected ? (
            <div className="flex h-full items-center justify-center text-gray-400">
              <div className="text-center">
                <div className="text-4xl">👈</div>
                <p className="mt-2 text-sm">Selecione um aluno para registrar notas</p>
              </div>
            </div>
          ) : (
            <div className="p-4 lg:p-6">
              <div className="mb-5 flex items-center gap-3">
                <button
                  onClick={() => setMobileView('list')}
                  className="shrink-0 rounded-lg border border-gray-200 p-1.5 text-gray-500 hover:bg-gray-50 lg:hidden"
                  aria-label="Voltar"
                >
                  ←
                </button>
                <div className="min-w-0">
                  <h2 className="truncate text-base font-semibold text-gray-900">{selected.name}</h2>
                  <p className="truncate text-sm text-gray-400">{selected.email}</p>
                </div>
              </div>

              <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end">
                <div className="flex-1">
                  <label className="mb-1 block text-xs font-medium text-gray-500">Disciplina</label>
                  <input
                    type="text"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="Ex: Matemática"
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-brand-400 focus:ring-1 focus:ring-brand-400"
                  />
                </div>
                <div className="w-full sm:w-28">
                  <label className="mb-1 block text-xs font-medium text-gray-500">Nota</label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    placeholder="Ex: 8.5"
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-brand-400 focus:ring-1 focus:ring-brand-400"
                  />
                </div>
                <button
                  onClick={addGrade}
                  disabled={saving}
                  className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
                >
                  {saving ? 'Salvando...' : 'Adicionar'}
                </button>
              </div>

              {error && (
                <div className="mb-4 rounded-lg bg-red-50 px-4 py-2.5 text-sm text-red-600">
                  {error}
                </div>
              )}

              {loadingGrades ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => <div key={i} className="h-12 animate-pulse rounded-xl bg-gray-100" />)}
                </div>
              ) : grades.length === 0 ? (
                <p className="text-sm text-gray-400">Nenhuma nota registrada ainda.</p>
              ) : (
                <div className="space-y-2">
                  {grades.map((g) => (
                    <div key={g.id} className="flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50 px-4 py-3">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{g.subject}</p>
                        <p className="text-xs text-gray-400">{new Date(g.createdAt).toLocaleDateString('pt-BR')}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="rounded-full bg-brand-100 px-3 py-1 text-sm font-semibold text-brand-700">{g.value}</span>
                        <button
                          onClick={() => removeGrade(g.id)}
                          disabled={deletingId === g.id}
                          className="text-xs font-medium text-red-500 hover:text-red-600 disabled:opacity-60"
                        >
                          {deletingId === g.id ? '...' : 'Excluir'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
