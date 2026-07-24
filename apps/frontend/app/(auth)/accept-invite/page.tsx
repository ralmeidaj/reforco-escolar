'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import axios from 'axios';
import { setTenantSlug } from '@/app/lib/api';
import { LoadingOverlay } from '@/app/components/LoadingOverlay';
import { Spinner } from '@/app/components/Spinner';
import type { AuthResponse, UserRole } from '@/app/lib/types';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';

const ROLE_REDIRECTS: Record<UserRole, string> = {
  tenant_admin: '/admin',
  teacher: '/teacher',
  student: '/student',
  guardian: '/guardian',
};

function AcceptInviteForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token') ?? '';
  const slug = searchParams.get('slug') ?? '';

  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!token || !slug) setError('Link de convite inválido.');
  }, [token, slug]);

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

  return (
    <>
      <LoadingOverlay visible={loading} message="Criando conta..." />
      <form onSubmit={handleSubmit} className="space-y-4">
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
          {loading ? 'Criando conta...' : 'Criar minha conta'}
        </button>
      </form>
    </>
  );
}

export default function AcceptInvitePage() {
  return (
    <Suspense fallback={<div className="flex justify-center p-8"><Spinner size="lg" className="text-brand-600" /></div>}>
      <AcceptInviteForm />
    </Suspense>
  );
}
