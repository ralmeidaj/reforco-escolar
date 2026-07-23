'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { saApi, loadSaToken } from '../../../lib/sa-api';
import { LoadingOverlay } from '@/app/components/LoadingOverlay';

interface Tenant {
  id: string;
  name: string;
  slug: string;
  status: string;
  saasStatus: string;
  createdAt: string;
  adminEmail?: string | null;
}

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-green-100 text-green-700 border border-green-200',
  suspended: 'bg-yellow-100 text-yellow-700 border border-yellow-200',
  deleted: 'bg-red-100 text-red-700 border border-red-200',
};

const STATUS_LABEL: Record<string, string> = {
  active: 'Ativo',
  suspended: 'Suspenso',
  deleted: 'Excluído',
};

export default function SuperAdminTenants() {
  const router = useRouter();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState('');

  // formulário de criação
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: '', slug: '', adminEmail: '', adminPassword: '' });

  // edição inline
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ name: '', slug: '', adminEmail: '', adminPassword: '' });
  const [editSaving, setEditSaving] = useState(false);

  useEffect(() => {
    loadSaToken();
    saApi.get('/tenants').then((r) => setTenants(r.data)).catch(() => router.push('/super-admin/login')).finally(() => setLoading(false));
  }, []);

  async function createTenant(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const res = await saApi.post('/tenants', form);
      setTenants((prev) => [res.data, ...prev]);
      setForm({ name: '', slug: '', adminEmail: '', adminPassword: '' });
      setShowForm(false);
    } catch (e: any) {
      setError(e.response?.data?.message ?? 'Erro ao criar reforço');
    } finally {
      setSaving(false);
    }
  }

  function startEdit(t: Tenant) {
    setEditingId(t.id);
    setEditForm({ name: t.name, slug: t.slug, adminEmail: t.adminEmail ?? '', adminPassword: '' });
    setShowForm(false);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditForm({ name: '', slug: '', adminEmail: '', adminPassword: '' });
  }

  async function saveEdit(id: string) {
    setEditSaving(true);
    setError('');
    try {
      const payload: Record<string, string> = { name: editForm.name, slug: editForm.slug };
      if (editForm.adminEmail.trim()) payload.adminEmail = editForm.adminEmail.trim();
      if (editForm.adminPassword.trim()) payload.adminPassword = editForm.adminPassword;
      const res = await saApi.patch(`/tenants/${id}`, payload);
      setTenants((prev) => prev.map((t) => t.id === id ? { ...t, ...res.data } : t));
      setEditingId(null);
    } catch (e: any) {
      setError(e.response?.data?.message ?? 'Erro ao salvar alterações');
    } finally {
      setEditSaving(false);
    }
  }

  async function updateStatus(id: string, status: string) {
    const label = status === 'suspended' ? 'suspender' : status === 'active' ? 'ativar' : 'excluir';
    if (!confirm(`Confirmar: ${label} este reforço?`)) return;
    setActionLoading(id);
    setError('');
    try {
      await saApi.patch(`/tenants/${id}/status`, { status });
      setTenants((prev) => prev.map((t) => t.id === id ? { ...t, status, saasStatus: status } : t));
    } catch (e: any) {
      setError(e.response?.data?.message ?? 'Erro ao atualizar status');
    } finally {
      setActionLoading(null);
    }
  }

  async function impersonate(id: string) {
    setActionLoading(`imp-${id}`);
    setError('');
    try {
      const res = await saApi.post(`/tenants/${id}/impersonate`);
      const { accessToken, tenantSlug } = res.data;
      alert(`Token de impersonation gerado para "${tenantSlug}" — válido por 1 hora.\n\nToken: ${accessToken}`);
    } catch (e: any) {
      setError(e.response?.data?.message ?? 'Erro ao impersonar');
    } finally {
      setActionLoading(null);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <LoadingOverlay visible={saving || editSaving || actionLoading !== null} message="Aguarde..." />
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center gap-4">
        <button
          onClick={() => router.push('/super-admin/dashboard')}
          className="cursor-pointer text-gray-500 hover:text-blue-600 text-sm font-medium transition"
        >
          ← Dashboard
        </button>
        <h1 className="text-lg font-bold text-gray-900">Reforços</h1>
        <div className="ml-auto">
          <button
            onClick={() => { setShowForm(!showForm); cancelEdit(); }}
            className="cursor-pointer px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition"
          >
            + Novo Reforço
          </button>
        </div>
      </header>

      <main className="p-6 max-w-6xl mx-auto">
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">{error}</div>
        )}

        {/* Formulário de criação */}
        {showForm && (
          <form onSubmit={createTenant} className="mb-6 p-6 bg-white border border-gray-200 rounded-xl space-y-4">
            <h2 className="font-semibold text-gray-900 text-lg">Novo Reforço</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome do reforço</label>
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Ex.: Reforço Silva"
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Slug (subdomínio)</label>
                <input
                  value={form.slug}
                  onChange={(e) => setForm({ ...form, slug: e.target.value.toLowerCase().replace(/\s+/g, '-') })}
                  placeholder="Ex.: reforco-silva"
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">E-mail do responsável</label>
                <input
                  type="email"
                  value={form.adminEmail}
                  onChange={(e) => setForm({ ...form, adminEmail: e.target.value })}
                  placeholder="responsavel@reforco.com"
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Senha inicial</label>
                <input
                  type="password"
                  value={form.adminPassword}
                  onChange={(e) => setForm({ ...form, adminPassword: e.target.value })}
                  placeholder="Mínimo 8 caracteres"
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
            </div>
            <div className="flex gap-3">
              <button
                type="submit"
                disabled={saving}
                className="cursor-pointer px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition disabled:opacity-60"
              >
                Criar Reforço
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="cursor-pointer px-6 py-2 text-gray-500 hover:text-gray-700 text-sm transition"
              >
                Cancelar
              </button>
            </div>
          </form>
        )}

        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-16 bg-gray-200 animate-pulse rounded-lg" />
            ))}
          </div>
        ) : (
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="text-left py-3 px-4 text-gray-500 font-medium">Nome</th>
                    <th className="text-left py-3 px-4 text-gray-500 font-medium">Slug</th>
                    <th className="text-left py-3 px-4 text-gray-500 font-medium">E-mail responsável</th>
                    <th className="text-left py-3 px-4 text-gray-500 font-medium">Status</th>
                    <th className="text-left py-3 px-4 text-gray-500 font-medium">Criado em</th>
                    <th className="text-right py-3 px-4 text-gray-500 font-medium">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {tenants.map((t) => (
                    <React.Fragment key={t.id}>
                      <tr className={`border-b border-gray-100 transition ${editingId === t.id ? 'bg-blue-50' : 'hover:bg-gray-50'}`}>
                        <td className="py-3 px-4 font-medium text-gray-900">{t.name}</td>
                        <td className="py-3 px-4 text-gray-400 font-mono text-xs">{t.slug}</td>
                        <td className="py-3 px-4 text-gray-500 text-xs">{t.adminEmail ?? '—'}</td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[t.status] ?? 'bg-gray-100 text-gray-600 border border-gray-200'}`}>
                            {STATUS_LABEL[t.status] ?? t.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-gray-500">{new Date(t.createdAt).toLocaleDateString('pt-BR')}</td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex gap-2 justify-end">
                            {t.status !== 'deleted' && (
                              <>
                                <button
                                  onClick={() => editingId === t.id ? cancelEdit() : startEdit(t)}
                                  className="cursor-pointer px-3 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded text-xs transition"
                                >
                                  {editingId === t.id ? 'Cancelar' : 'Editar'}
                                </button>
                                <button
                                  onClick={() => impersonate(t.id)}
                                  disabled={actionLoading === `imp-${t.id}`}
                                  className="cursor-pointer px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded text-xs disabled:opacity-60 transition"
                                >
                                  Impersonar
                                </button>
                                {t.status === 'active' ? (
                                  <button
                                    onClick={() => updateStatus(t.id, 'suspended')}
                                    disabled={actionLoading === t.id}
                                    className="cursor-pointer px-3 py-1 bg-yellow-500 hover:bg-yellow-600 text-white rounded text-xs disabled:opacity-60 transition"
                                  >
                                    Suspender
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => updateStatus(t.id, 'active')}
                                    disabled={actionLoading === t.id}
                                    className="cursor-pointer px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-xs disabled:opacity-60 transition"
                                  >
                                    Ativar
                                  </button>
                                )}
                                <button
                                  onClick={() => updateStatus(t.id, 'deleted')}
                                  disabled={actionLoading === t.id}
                                  className="cursor-pointer px-3 py-1 bg-red-500 hover:bg-red-600 text-white rounded text-xs disabled:opacity-60 transition"
                                >
                                  Excluir
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>

                      {/* linha de edição inline */}
                      {editingId === t.id && (
                        <tr className="border-b border-blue-100 bg-blue-50">
                          <td colSpan={6} className="px-4 py-4">
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
                              <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">Nome</label>
                                <input
                                  value={editForm.name}
                                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                                  className="w-full px-3 py-1.5 bg-white border border-gray-300 rounded-lg text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">Slug</label>
                                <input
                                  value={editForm.slug}
                                  onChange={(e) => setEditForm({ ...editForm, slug: e.target.value.toLowerCase().replace(/\s+/g, '-') })}
                                  className="w-full px-3 py-1.5 bg-white border border-gray-300 rounded-lg text-gray-900 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">E-mail do responsável</label>
                                <input
                                  type="email"
                                  value={editForm.adminEmail}
                                  onChange={(e) => setEditForm({ ...editForm, adminEmail: e.target.value })}
                                  placeholder="email@reforco.com"
                                  className="w-full px-3 py-1.5 bg-white border border-gray-300 rounded-lg text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">Nova senha <span className="text-gray-400 font-normal">(opcional)</span></label>
                                <input
                                  type="password"
                                  value={editForm.adminPassword}
                                  onChange={(e) => setEditForm({ ...editForm, adminPassword: e.target.value })}
                                  placeholder="Deixe vazio para não alterar"
                                  className="w-full px-3 py-1.5 bg-white border border-gray-300 rounded-lg text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                              </div>
                            </div>
                            <div className="flex gap-3">
                              <button
                                onClick={() => saveEdit(t.id)}
                                disabled={editSaving}
                                className="cursor-pointer px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition disabled:opacity-60"
                              >
                                Salvar
                              </button>
                              <button
                                onClick={cancelEdit}
                                className="cursor-pointer px-4 py-1.5 text-gray-500 hover:text-gray-700 text-sm transition"
                              >
                                Cancelar
                              </button>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                  {tenants.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-gray-400">
                        Nenhum reforço cadastrado ainda. Clique em "Novo Reforço" para começar.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
