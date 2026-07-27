'use client';

import { useState, useEffect, useRef } from 'react';
import { api } from '@/app/lib/api';

interface Task {
  id: string;
  title: string;
  description: string | null;
  type: string;
  dueDate: string | null;
  done: boolean;
  subject?: { name: string };
}

interface Submission {
  id: string;
  fileUrl: string;
  fileType: string;
  comment: string | null;
  createdAt: string;
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

export default function StudentActivityPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [submissions, setSubmissions] = useState<Record<string, Submission[]>>({});
  const [expanded, setExpanded] = useState<string | null>(null);
  const [uploading, setUploading] = useState<string | null>(null);
  const [comment, setComment] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    api.get<Task[]>('/tasks/me')
      .then(({ data }) => setTasks(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function loadSubmissions(taskId: string) {
    if (submissions[taskId]) return;
    try {
      const { data } = await api.get<Submission[]>(`/activity-submissions/task/${taskId}`);
      setSubmissions((s) => ({ ...s, [taskId]: data }));
    } catch {}
  }

  function toggleTask(taskId: string) {
    if (expanded === taskId) { setExpanded(null); return; }
    setExpanded(taskId);
    loadSubmissions(taskId);
  }

  async function upload(taskId: string) {
    const file = fileRef.current?.files?.[0];
    if (!file) return;
    setUploading(taskId);
    setError('');
    try {
      const form = new FormData();
      form.append('file', file);
      form.append('taskId', taskId);
      if (comment.trim()) form.append('comment', comment.trim());
      const { data } = await api.post<Submission>('/activity-submissions', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setSubmissions((s) => ({ ...s, [taskId]: [...(s[taskId] ?? []), data] }));
      setComment('');
      if (fileRef.current) fileRef.current.value = '';
    } catch (err: any) {
      setError(err.response?.data?.message ?? 'Erro ao enviar atividade');
    } finally {
      setUploading(null);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Atividades</h1>
        <p className="mt-1 text-sm text-gray-500">Envie a foto ou PDF da atividade corrigida</p>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => <div key={i} className="h-20 animate-pulse rounded-2xl bg-gray-100" />)}
        </div>
      ) : tasks.length === 0 ? (
        <div className="rounded-2xl bg-white p-8 text-center shadow-sm">
          <p className="text-sm text-gray-500">Nenhuma tarefa encontrada.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {tasks.map((t) => (
            <div key={t.id} className="rounded-2xl bg-white shadow-sm overflow-hidden">
              <button
                onClick={() => toggleTask(t.id)}
                className="flex w-full items-center justify-between px-5 py-4 text-left"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${TYPE_COLORS[t.type] ?? 'bg-gray-100 text-gray-600'}`}>
                      {TYPE_LABELS[t.type] ?? t.type}
                    </span>
                    {t.done && (
                      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">Concluída</span>
                    )}
                  </div>
                  <p className="mt-1 truncate text-sm font-semibold text-gray-800">{t.title}</p>
                  {t.subject?.name && <p className="text-xs text-gray-400">{t.subject.name}</p>}
                </div>
                <span className="ml-4 shrink-0 text-gray-400">{expanded === t.id ? '▲' : '▼'}</span>
              </button>

              {expanded === t.id && (
                <div className="border-t border-gray-100 px-5 pb-5 pt-4 space-y-4">
                  {t.description && <p className="text-sm text-gray-600">{t.description}</p>}
                  {t.dueDate && (
                    <p className="text-xs text-gray-400">
                      Prazo: {new Date(t.dueDate).toLocaleDateString('pt-BR')}
                    </p>
                  )}

                  {/* Submissões existentes */}
                  {(submissions[t.id] ?? []).length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs font-semibold text-gray-500">Envios anteriores</p>
                      {submissions[t.id].map((s) => (
                        <div key={s.id} className="flex items-center gap-3 rounded-lg bg-gray-50 p-3">
                          <a href={s.fileUrl} target="_blank" rel="noreferrer"
                            className="text-sm font-medium text-brand-600 hover:underline">
                            Ver arquivo ({s.fileType})
                          </a>
                          {s.comment && <span className="text-xs text-gray-500">— {s.comment}</span>}
                          <span className="ml-auto text-[11px] text-gray-400">
                            {new Date(s.createdAt).toLocaleDateString('pt-BR')}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Upload */}
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-gray-500">Enviar atividade</p>
                    <input ref={fileRef} type="file" accept="image/*,.pdf"
                      className="block w-full text-sm text-gray-500 file:mr-3 file:rounded-lg file:border-0 file:bg-brand-50 file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-brand-700 hover:file:bg-brand-100" />
                    <input
                      type="text"
                      placeholder="Comentário (opcional)"
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-600"
                    />
                    {error && <p className="text-xs text-red-500">{error}</p>}
                    <button
                      onClick={() => upload(t.id)}
                      disabled={uploading === t.id}
                      className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
                    >
                      {uploading === t.id ? 'Enviando...' : 'Enviar'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
