'use client';

import { useState, useEffect } from 'react';
import { api } from '@/app/lib/api';

interface Announcement {
  id: string;
  title: string;
  content: string;
  targetRoles: string[];
  createdAt: string;
}

const ROLE_OPTIONS: { value: string; label: string }[] = [
  { value: 'tenant_admin', label: 'Admin' },
  { value: 'teacher', label: 'Professores' },
  { value: 'student', label: 'Alunos' },
  { value: 'guardian', label: 'Responsáveis' },
];

function SkeletonCard() {
  return <div className="h-20 animate-pulse rounded-2xl bg-gray-100" />;
}

export default function AdminAnnouncementsPage() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: '', content: '', targetRoles: [] as string[] });
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState('');

  function loadAnnouncements() {
    return api.get<Announcement[]>('/announcements/all').then(({ data }) => setAnnouncements(data));
  }

  useEffect(() => {
    loadAnnouncements().catch(() => {}).finally(() => setLoading(false));
  }, []);

  function toggleRole(role: string) {
    setForm((f) => ({
      ...f,
      targetRoles: f.targetRoles.includes(role) ? f.targetRoles.filter((r) => r !== role) : [...f.targetRoles, role],
    }));
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      await api.post('/announcements', form);
      await loadAnnouncements();
      setForm({ title: '', content: '', targetRoles: [] });
      setShowForm(false);
    } catch (err: any) {
      setError(err.response?.data?.message ?? 'Erro ao criar aviso');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    try {
      await api.delete(`/announcements/${id}`);
      setAnnouncements((prev) => prev.filter((a) => a.id !== id));
    } catch {
      setError('Erro ao excluir aviso');
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Avisos</h1>
          <p className="mt-1 text-sm text-gray-500">Comunicados gerais para a escola</p>
        </div>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
        >
          {showForm ? 'Cancelar' : '+ Novo aviso'}
        </button>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {showForm && (
        <form onSubmit={handleCreate} className="space-y-4 rounded-2xl bg-white p-5 shadow-sm">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Título</label>
            <input
              required
              type="text"
              maxLength={200}
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-600"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Conteúdo</label>
            <textarea
              required
              rows={4}
              value={form.content}
              onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-600"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Enviar para <span className="font-normal text-gray-400">(vazio = todos os roles)</span>
            </label>
            <div className="flex flex-wrap gap-3">
              {ROLE_OPTIONS.map((r) => (
                <label key={r.value} className="flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={form.targetRoles.includes(r.value)}
                    onChange={() => toggleRole(r.value)}
                    className="rounded border-gray-300 text-brand-600 focus:ring-brand-600"
                  />
                  {r.label}
                </label>
              ))}
            </div>
          </div>
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
          >
            {saving ? 'Publicando...' : 'Publicar aviso'}
          </button>
        </form>
      )}

      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : announcements.length === 0 ? (
        <div className="rounded-2xl bg-white p-8 text-center shadow-sm">
          <p className="text-sm text-gray-400">Nenhum aviso publicado ainda.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {announcements.map((a) => (
            <div key={a.id} className="rounded-2xl bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold text-gray-900">{a.title}</h3>
                  <p className="mt-0.5 text-xs text-gray-400">
                    {new Date(a.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    {' · '}
                    {a.targetRoles.length === 0
                      ? 'Todos'
                      : a.targetRoles.map((r) => ROLE_OPTIONS.find((o) => o.value === r)?.label ?? r).join(', ')}
                  </p>
                </div>
                <button
                  onClick={() => handleDelete(a.id)}
                  disabled={deletingId === a.id}
                  className="shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-60"
                >
                  {deletingId === a.id ? 'Excluindo...' : 'Excluir'}
                </button>
              </div>
              <p className="mt-2 whitespace-pre-wrap text-sm text-gray-600">{a.content}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
