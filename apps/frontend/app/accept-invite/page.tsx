'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';
import { setTenantSlug } from '@/app/lib/api';
import { Spinner } from '@/app/components/Spinner';
import type { AuthResponse, UserRole } from '@/app/lib/types';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';

const ROLE_REDIRECTS: Record<UserRole, string> = {
  tenant_admin: '/admin',
  teacher: '/teacher',
  student: '/student',
  guardian: '/guardian',
};

export default function AcceptInvitePage() {
  const [token, setToken] = useState('');
  const [slug, setSlug] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const t = params.get('token') ?? '';
    const s = params.get('slug') ?? '';
    setToken(t);
    setSlug(s);
    if (!t || !s) setError('Link de convite inválido.');
    setReady(true);
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      setTenantSlug(slug);
      const { data } = await axios.post<AuthResponse>(
        `${BASE_URL}/auth/invite/accept`,
        { token, name, password },
        { withCredentials: true },
      );
      await fetch('/api/auth/callback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accessToken: data.accessToken, refreshToken: data.refreshToken }),
      });
      window.location.assign(ROLE_REDIRECTS[data.user.role] ?? '/');
    } catch (err: any) {
      const msg = Array.isArray(err.response?.data?.message)
        ? err.response.data.message.join(', ')
        : (err.response?.data?.message ?? 'Erro ao criar conta');
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner size="lg" className="text-brand-600" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-6 py-12">
      <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Criar conta</h2>
          <p className="mt-1 text-sm text-gray-500">Preencha seus dados para aceitar o convite</p>
        </div>

        {error && (
          <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</div>
        )}

        <div>
          <label htmlFor="name" className="mb-1 block text-sm font-medium text-gray-700">
            Nome completo
          </label>
          <input
            id="name"
            type="text"
            required
            disabled={loading}
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 disabled:bg-gray-50 disabled:opacity-60"
            placeholder="Seu nome completo"
          />
        </div>

        <div>
          <label htmlFor="password" className="mb-1 block text-sm font-medium text-gray-700">
            Senha
          </label>
          <input
            id="password"
            type="password"
            required
            minLength={6}
            disabled={loading}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 disabled:bg-gray-50 disabled:opacity-60"
            placeholder="Mínimo 6 caracteres"
          />
        </div>

        <button
          type="submit"
          disabled={loading || !token || !slug}
          className="w-full rounded-lg bg-brand-600 py-2.5 text-sm font-medium text-white hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading
            ? <span className="flex items-center justify-center gap-2"><Spinner size="sm" className="text-white" />Criando conta...</span>
            : 'Criar minha conta'}
        </button>
      </form>
    </div>
  );
}
