'use client';

import { useState, useEffect } from 'react';
import { api } from '@/app/lib/api';

interface Task {
  id: string;
  title: string;
  type: string;
  dueDate: string | null;
  done: boolean;
  student?: { id: string; name: string };
  subject?: { id: string; name: string };
}

interface Student { id: string; name: string }
interface Subject { id: string; name: string }

const TYPE_LABELS: Record<string, string> = {
  padrao: 'Padrão',
  trabalho: 'Trabalho',
  eureka: 'Eureka',
  trilha: 'Trilha',
};

const TYPE_COLORS: Record<string, string> = {
  padrao: 'bg-gray-100 text-gray-600',
  trabalho: 'bg-blue-100 text-blue-700',
  eureka: 'bg-purple-100 text-purple-700',
  trilha: 'bg-amber-100 text-amber-700',
};

export default function TeacherTasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    studentId: '',
    subjectId: '',
    title: '',
    type: 'padrao',
    dueDate: '',
    description: '',
  });
  const [error, setError] = useState('');

  async function loadTasks() {
    const { data } = await api.get<Task[]>('/tasks/teacher');
    setTasks(data);
  }

  useEffect(() => {
    Promise.all([
      api.get<Task[]>('/tasks/teacher'),
      api.get<Student[]>('/auth/users?role=student'),
      api.get<Subject[]>('/subjects'),
    ])
      .then(([t, s, sub]) => {
        setTasks(t.data);
        setStudents(s.data);
        setSubjects(sub.data);
      })
      .finally(() => setLoading(false));
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      await api.post('/tasks', {
        studentId: form.studentId,
        subjectId: form.subjectId,
        title: form.title,
        type: form.type,
        dueDate: form.dueDate || undefined,
        description: form.description || undefined,
      });
      await loadTasks();
      setForm({ studentId: '', subjectId: '', title: '', type: 'padrao', dueDate: '', description: '' });
      setShowForm(false);
    } catch (err: any) {
      setError(err.response?.data?.message ?? 'Erro ao criar tarefa');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    await api.delete(`/tasks/${id}`);
    setTasks((prev) => prev.filter((t) => t.id !== id));
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 animate-pulse rounded bg-gray-200" />
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-16 animate-pulse rounded-2xl bg-gray-100" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tarefas</h1>
          <p className="mt-1 text-sm text-gray-500">Crie e gerencie tarefas para seus alunos</p>
        </div>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
        >
          {showForm ? 'Cancelar' : '+ Nova tarefa'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="rounded-2xl bg-white p-5 shadow-sm space-y-4">
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Aluno</label>
              <select
                required
                value={form.studentId}
                onChange={(e) => setForm((f) => ({ ...f, studentId: e.target.value }))}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-600"
              >
                <option value="">Selecione...</option>
                {students.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Disciplina</label>
              <select
                required
                value={form.subjectId}
                onChange={(e) => setForm((f) => ({ ...f, subjectId: e.target.value }))}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-600"
              >
                <option value="">Selecione...</option>
                {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Título</label>
            <input
              required
              type="text"
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="Ex.: Exercícios de frações"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-600"
            />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
              <select
                value={form.type}
                onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-600"
              >
                {Object.entries(TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Prazo</label>
              <input
                type="date"
                value={form.dueDate}
                onChange={(e) => setForm((f) => ({ ...f, dueDate: e.target.value }))}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-600"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Descrição (opcional)</label>
            <textarea
              rows={2}
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-600"
            />
          </div>
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
          >
            {saving ? 'Criando...' : 'Criar tarefa'}
          </button>
        </form>
      )}

      <div className="space-y-3">
        {tasks.length === 0 ? (
          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-sm text-gray-400">Nenhuma tarefa criada ainda.</p>
          </div>
        ) : (
          tasks.map((task) => (
            <div key={task.id} className="rounded-2xl bg-white p-4 shadow-sm flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium text-gray-900 truncate">{task.title}</span>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${TYPE_COLORS[task.type] ?? 'bg-gray-100 text-gray-600'}`}>
                    {TYPE_LABELS[task.type] ?? task.type}
                  </span>
                  {task.done && (
                    <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">Feita</span>
                  )}
                </div>
                <p className="mt-0.5 text-xs text-gray-500">
                  {task.student?.name ?? 'Aluno'}
                  {task.subject ? ` · ${task.subject.name}` : ''}
                  {task.dueDate ? ` · Prazo: ${new Date(task.dueDate).toLocaleDateString('pt-BR')}` : ''}
                </p>
              </div>
              <button
                onClick={() => handleDelete(task.id)}
                className="shrink-0 text-xs text-red-500 hover:text-red-700"
              >
                Excluir
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
