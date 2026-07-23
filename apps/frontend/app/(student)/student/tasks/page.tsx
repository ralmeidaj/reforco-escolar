'use client';

import { useState, useEffect } from 'react';
import { api } from '@/app/lib/api';

interface Task {
  id: string;
  title: string;
  type: string;
  dueDate: string | null;
  done: boolean;
  doneAt: string | null;
  description: string | null;
  subject?: { name: string };
}

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

function isOverdue(dueDate: string | null) {
  if (!dueDate) return false;
  return new Date(dueDate) < new Date();
}

export default function StudentTasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [marking, setMarking] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'pending' | 'done'>('pending');

  useEffect(() => {
    api
      .get<Task[]>('/tasks/me')
      .then(({ data }) => setTasks(data))
      .finally(() => setLoading(false));
  }, []);

  async function markDone(id: string) {
    setMarking(id);
    try {
      const { data } = await api.patch<Task>(`/tasks/${id}/done`);
      setTasks((prev) => prev.map((t) => (t.id === id ? data : t)));
    } finally {
      setMarking(null);
    }
  }

  const filtered = tasks.filter((t) => {
    if (filter === 'pending') return !t.done;
    if (filter === 'done') return t.done;
    return true;
  });

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-40 animate-pulse rounded bg-gray-200" />
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-20 animate-pulse rounded-2xl bg-gray-100" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Minhas Tarefas</h1>
        <p className="mt-1 text-sm text-gray-500">{tasks.filter((t) => !t.done).length} pendentes</p>
      </div>

      <div className="flex gap-2">
        {(['pending', 'all', 'done'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              filter === f ? 'bg-brand-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {f === 'pending' ? 'Pendentes' : f === 'done' ? 'Feitas' : 'Todas'}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-sm text-gray-400">
              {filter === 'pending' ? 'Nenhuma tarefa pendente. Bom trabalho!' : 'Sem tarefas aqui.'}
            </p>
          </div>
        ) : (
          filtered.map((task) => (
            <div
              key={task.id}
              className={`rounded-2xl bg-white p-4 shadow-sm flex items-start justify-between gap-3 ${
                task.done ? 'opacity-60' : ''
              }`}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`text-sm font-medium ${task.done ? 'line-through text-gray-400' : 'text-gray-900'} truncate`}>
                    {task.title}
                  </span>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${TYPE_COLORS[task.type] ?? 'bg-gray-100 text-gray-600'}`}>
                    {TYPE_LABELS[task.type] ?? task.type}
                  </span>
                  {task.dueDate && !task.done && isOverdue(task.dueDate) && (
                    <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">Atrasada</span>
                  )}
                </div>
                {task.description && (
                  <p className="mt-0.5 text-xs text-gray-500 truncate">{task.description}</p>
                )}
                <p className="mt-0.5 text-xs text-gray-400">
                  {task.subject?.name ?? 'Disciplina'}
                  {task.dueDate ? ` · Prazo: ${new Date(task.dueDate).toLocaleDateString('pt-BR')}` : ''}
                  {task.done && task.doneAt ? ` · Concluída em ${new Date(task.doneAt).toLocaleDateString('pt-BR')}` : ''}
                </p>
              </div>
              {!task.done && (
                <button
                  disabled={marking === task.id}
                  onClick={() => markDone(task.id)}
                  className="shrink-0 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
                >
                  {marking === task.id ? 'Salvando...' : 'Marcar feita'}
                </button>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
