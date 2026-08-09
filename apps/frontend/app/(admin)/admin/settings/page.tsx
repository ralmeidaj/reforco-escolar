'use client';

import { useState, useEffect } from 'react';
import { api } from '@/app/lib/api';
import { LoadingOverlay } from '@/app/components/LoadingOverlay';
import type { OpenAiKeyStatus } from '@/app/lib/types';

interface Me { name: string; email: string; role: string }

export default function AdminSettingsPage() {
  const [me, setMe] = useState<Me | null>(null);
  const [form, setForm] = useState({ name: '', email: '', currentPassword: '', newPassword: '', confirmPassword: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const [aiStatus, setAiStatus] = useState<OpenAiKeyStatus | null>(null);
  const [loadingAi, setLoadingAi] = useState(true);
  const [newApiKey, setNewApiKey] = useState('');
  const [savingAi, setSavingAi] = useState(false);
  const [removingAi, setRemovingAi] = useState(false);
  const [aiSuccess, setAiSuccess] = useState('');
  const [aiError, setAiError] = useState('');

  useEffect(() => {
    api.get<Me>('/auth/me')
      .then(({ data }) => {
        setMe(data);
        setForm((f) => ({ ...f, name: data.name, email: data.email }));
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    api.get<OpenAiKeyStatus>('/tenants/me/openai-key')
      .then(({ data }) => setAiStatus(data))
      .finally(() => setLoadingAi(false));
  }, []);

  async function handleSaveAiKey(e: React.FormEvent) {
    e.preventDefault();
    setAiError('');
    setAiSuccess('');
    if (!newApiKey.trim()) return;

    setSavingAi(true);
    try {
      const { data } = await api.put<OpenAiKeyStatus>('/tenants/me/openai-key', { apiKey: newApiKey.trim() });
      setAiStatus(data);
      setNewApiKey('');
      setAiSuccess('Chave salva com sucesso!');
    } catch (err: any) {
      const msg = Array.isArray(err.response?.data?.message)
        ? err.response.data.message.join(', ')
        : (err.response?.data?.message ?? 'Erro ao salvar a chave');
      setAiError(msg);
    } finally {
      setSavingAi(false);
    }
  }

  async function handleRemoveAiKey() {
    setAiError('');
    setAiSuccess('');
    setRemovingAi(true);
    try {
      await api.delete('/tenants/me/openai-key');
      setAiStatus({ hasKey: false, keyPreview: null });
      setAiSuccess('Chave removida — usando a chave da plataforma agora.');
    } catch {
      setAiError('Erro ao remover a chave');
    } finally {
      setRemovingAi(false);
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (form.newPassword && form.newPassword !== form.confirmPassword) {
      setError('A nova senha e a confirmação não coincidem.');
      return;
    }

    setSaving(true);
    try {
      await api.patch('/auth/profile', {
        name: form.name,
        email: form.email,
        currentPassword: form.currentPassword || undefined,
        newPassword: form.newPassword || undefined,
      });
      setSuccess('Configurações salvas com sucesso!');
      setForm((f) => ({ ...f, currentPassword: '', newPassword: '', confirmPassword: '' }));
    } catch (err: any) {
      const msg = Array.isArray(err.response?.data?.message)
        ? err.response.data.message.join(', ')
        : (err.response?.data?.message ?? 'Erro ao salvar');
      setError(msg);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <LoadingOverlay visible={saving || savingAi || removingAi} message="Salvando..." />

      <div>
        <h1 className="text-2xl font-bold text-gray-900">Configurações</h1>
        <p className="mt-1 text-sm text-gray-500">Gerencie seu perfil e senha</p>
      </div>

      {loading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-14 animate-pulse rounded-xl bg-gray-200" />
          ))}
        </div>
      ) : (
        <form onSubmit={handleSave} className="space-y-5">
          {error && (
            <div className="rounded-xl bg-red-50 p-3 text-sm text-red-600">{error}</div>
          )}
          {success && (
            <div className="rounded-xl bg-green-50 p-3 text-sm text-green-700">{success}</div>
          )}

          {/* Dados pessoais */}
          <div className="rounded-2xl bg-white p-6 shadow-sm space-y-4">
            <h2 className="text-sm font-semibold text-gray-700">Dados pessoais</h2>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Nome</label>
              <input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                required
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">E-mail</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                required
              />
            </div>
          </div>

          {/* Alterar senha */}
          <div className="rounded-2xl bg-white p-6 shadow-sm space-y-4">
            <h2 className="text-sm font-semibold text-gray-700">Alterar senha <span className="font-normal text-gray-400">(opcional)</span></h2>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Senha atual</label>
              <input
                type="password"
                value={form.currentPassword}
                onChange={(e) => setForm((f) => ({ ...f, currentPassword: e.target.value }))}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                placeholder="Deixe em branco para não alterar"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Nova senha</label>
              <input
                type="password"
                value={form.newPassword}
                onChange={(e) => setForm((f) => ({ ...f, newPassword: e.target.value }))}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                placeholder="Mínimo 8 caracteres"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Confirmar nova senha</label>
              <input
                type="password"
                value={form.confirmPassword}
                onChange={(e) => setForm((f) => ({ ...f, confirmPassword: e.target.value }))}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-brand-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
            >
              {saving ? 'Salvando...' : 'Salvar alterações'}
            </button>
          </div>
        </form>
      )}

      <form onSubmit={handleSaveAiKey} className="space-y-3">
        <div className="rounded-2xl bg-white p-6 shadow-sm space-y-4">
          <h2 className="text-sm font-semibold text-gray-700">Integração de IA</h2>

          {aiError && (
            <div className="rounded-xl bg-red-50 p-3 text-sm text-red-600">{aiError}</div>
          )}
          {aiSuccess && (
            <div className="rounded-xl bg-green-50 p-3 text-sm text-green-700">{aiSuccess}</div>
          )}

          {loadingAi ? (
            <div className="h-14 animate-pulse rounded-xl bg-gray-200" />
          ) : (
            <>
              <p className="text-sm text-gray-500">
                {aiStatus?.hasKey
                  ? `Chave própria configurada (•••• ${aiStatus.keyPreview ?? '----'})`
                  : 'Usando a chave da OpenAI da plataforma (padrão).'}
              </p>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  {aiStatus?.hasKey ? 'Substituir chave' : 'Chave da OpenAI'}
                </label>
                <input
                  type="password"
                  autoComplete="off"
                  value={newApiKey}
                  onChange={(e) => setNewApiKey(e.target.value)}
                  placeholder="sk-..."
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                />
              </div>

              <div className="flex items-center justify-between">
                {aiStatus?.hasKey ? (
                  <button
                    type="button"
                    onClick={handleRemoveAiKey}
                    disabled={removingAi}
                    className="text-sm font-medium text-red-600 hover:text-red-700 disabled:opacity-60"
                  >
                    {removingAi ? 'Removendo...' : 'Remover chave'}
                  </button>
                ) : <span />}

                <button
                  type="submit"
                  disabled={savingAi || !newApiKey.trim()}
                  className="rounded-lg bg-brand-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
                >
                  {savingAi ? 'Salvando...' : 'Salvar chave'}
                </button>
              </div>
            </>
          )}
        </div>
      </form>
    </div>
  );
}
