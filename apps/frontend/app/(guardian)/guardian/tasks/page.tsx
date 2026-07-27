'use client';

import { useState, useEffect } from 'react';
import { api } from '@/app/lib/api';

interface Student { id: string; name: string }

interface Task {
  id: string;
  title: string;
  description: string | null;
  type: string;
  dueDate: string | null;
  done: boolean;
  doneAt: string | null;
  subject?: { name: string };
}

const TYPE_LABELS: Record<string, string> = {
  padrao: 'Padrão', trabalho: 'Trabalho', eureka: 'Eureka', trilha: 'Trilha',
};
const TYPE_COLORS: Record<string, string> = {
  padrao: 'bg-gray-100 text-gray-600',
  trabalho: 'bg-blue-100 text-blue-700',
  eureka: 'bg-purple-100 text-purple-700',
  trilha: 'bg-emerald-100 text-emerald-700',
};

function isOverdue(dueDate: string | null, done: boolean) {
  if (!dueDate || done) return false;
  return new Date(dueDate) < new Date();
}

export default function GuardianTasksPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [selected, setSelected] = useState('');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [filter, setFilter] = useState<'todas' | 'pendentes' | 'concluidas'>('todas');
  const [loading, setLoading] = useState(true);
  const [loadingTasks, setLoadingTasks] = useState(false);

  useEffect(() => {
    api.get<Student[]>('/guardian/students')
      .then(({ data }) => { setStudents(data); if (data.length > 0) setSelected(data[0].id); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!selected) return;
    setLoadingTasks(true);
    api.get<Task[]>(`/tasks/student/${selected}`)
      .then(({ data }) => setTasks(data))
      .catch(() => setTasks([]))
      .finally(() => setLoadingTasks(false));
  }, [selected]);

  const filtered = tasks.filter((t) =>
    filter === 'pendentes' ? !t.done : filter === 'concluidas' ? t.done : true,
  );

  const pendingCount = tasks.filter((t) => !t.done).length;

  if (loading) return (
    <div className="space-y-3">
      {[...Array(4)].map((_, i) => <div key={i} className="h-20 animate-pulse rounded-2xl bg-gray-100" />)}
    </div>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Tarefas</h1>
        <p className="mt-1 text-sm text-gray-500">Acompanhe as tarefas do seu filho</p>
      </div>

      {students.length > 1 && (
        <div className="rounded-2xl bg-white p-4 shadow-sm">
          <select value={selected} onChange={(e) => setSelected(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-600">
            {students.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
      )}

      {pendingCount > 0 && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm text-amber-700">
            <strong>{pendingCount}</strong> tarefa{pendingCount !== 1 ? 's' : ''} pendente{pendingCount !== 1 ? 's' : ''}.
          </p>
        </div>
      )}

      {/* Filtros */}
      <div className="flex gap-2">
        {(['todas', 'pendentes', 'concluidas'] as const).map((f) => (
          <button key={f} onClick={() => setFilter(f)}
            className={`rounded-full px-4 py-1.5 text-xs font-medium capitalize transition-colors ${
              filter === f ? 'bg-brand-600 text-white' : 'bg-white text-gray-600 shadow-sm hover:bg-gray-50'
            }`}>
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {loadingTasks ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => <div key={i} className="h-20 animate-pulse rounded-2xl bg-gray-100" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl bg-white p-8 text-center shadow-sm">
          <p className="text-sm text-gray-500">Nenhuma tarefa encontrada.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((t) => {
            const overdue = isOverdue(t.dueDate, t.done);
            return (
              <div key={t.id} className={`rounded-2xl bg-white p-5 shadow-sm ${overdue ? 'border border-red-200' : ''}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${TYPE_COLORS[t.type] ?? 'bg-gray-100 text-gray-600'}`}>
                        {TYPE_LABELS[t.type] ?? t.type}
                      </span>
                      {t.subject?.name && (
                        <span className="text-xs text-gray-400">{t.subject.name}</span>
                      )}
                    </div>
                    <p className={`mt-1 text-sm font-semibold ${t.done ? 'line-through text-gray-400' : 'text-gray-800'}`}>
                      {t.title}
                    </p>
                    {t.description && <p className="mt-1 text-xs text-gray-500 line-clamp-2">{t.description}</p>}
                    {t.dueDate && (
                      <p className={`mt-1 text-xs font-medium ${overdue ? 'text-red-500' : 'text-gray-400'}`}>
                        Prazo: {new Date(t.dueDate).toLocaleDateString('pt-BR')}{overdue ? ' — Atrasada' : ''}
                      </p>
                    )}
                  </div>
                  <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium ${
                    t.done ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                  }`}>
                    {t.done ? 'Concluída' : 'Pendente'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
