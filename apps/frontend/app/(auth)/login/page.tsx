'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api, setTenantSlug } from '@/app/lib/api';
import { LoadingOverlay } from '@/app/components/LoadingOverlay';
import type { AuthResponse, MobileLoginResponse, TenantOption, UserRole } from '@/app/lib/types';

const ROLE_REDIRECTS: Record<UserRole, string> = {
  tenant_admin: '/admin',
  teacher: '/teacher',
  student: '/student',
  guardian: '/guardian',
};

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [tenantOptions, setTenantOptions] = useState<TenantOption[] | null>(null);

  async function finishLogin(data: AuthResponse) {
    await fetch('/api/auth/callback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accessToken: data.accessToken, refreshToken: data.refreshToken }),
    });
    window.location.assign(ROLE_REDIRECTS[data.user.role] ?? '/');
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data } = await api.post<MobileLoginResponse>('/auth/login/mobile', { email, password });
      if ('requireTenantSelection' in data) {
        setTenantOptions(data.tenants);
        setLoading(false);
        return;
      }
      setTenantSlug(data.tenantSlug);
      await finishLogin(data);
    } catch (err: any) {
      const msg = Array.isArray(err.response?.data?.message)
        ? err.response.data.message.join(', ')
        : (err.response?.data?.message ?? err.message ?? 'E-mail ou senha incorretos');
      setError(msg);
      setLoading(false);
    }
  }

  async function handleSelectTenant(slug: string) {
    setError('');
    setLoading(true);
    try {
      setTenantSlug(slug);
      const { data } = await api.post<AuthResponse>('/auth/login', { email, password });
      await finishLogin(data);
    } catch (err: any) {
      const msg = Array.isArray(err.response?.data?.message)
        ? err.response.data.message.join(', ')
        : (err.response?.data?.message ?? err.message ?? 'E-mail ou senha incorretos');
      setError(msg);
      setLoading(false);
    }
  }

  if (tenantOptions) {
    return (
      <>
      <LoadingOverlay visible={loading} message="Entrando..." />
      <div className="space-y-4">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Escolha sua escola</h2>
          <p className="mt-1 text-sm text-gray-500">Seu e-mail está cadastrado em mais de um reforço.</p>
        </div>

        {error && (
          <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</div>
        )}

        <div className="space-y-2">
          {tenantOptions.map((t) => (
            <button
              key={t.slug}
              type="button"
              disabled={loading}
              onClick={() => handleSelectTenant(t.slug)}
              className="w-full rounded-lg border border-gray-300 px-4 py-3 text-left text-sm font-medium text-gray-800 transition hover:border-brand-500 hover:bg-brand-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {t.name}
            </button>
          ))}
        </div>

        <button
          type="button"
          disabled={loading}
          onClick={() => { setTenantOptions(null); setError(''); }}
          className="text-sm text-gray-500 hover:underline disabled:opacity-60"
        >
          ← Voltar
        </button>
      </div>
      </>
    );
  }

  return (
    <>
    <LoadingOverlay visible={loading} message="Entrando..." />
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">Entrar</h2>
        <p className="mt-1 text-sm text-gray-500">Acesse sua conta no reforço escolar</p>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</div>
      )}

      <div>
        <label htmlFor="email" className="mb-1 block text-sm font-medium text-gray-700">
          E-mail
        </label>
        <input
          id="email"
          type="email"
          autoComplete="email"
          required
          disabled={loading}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 disabled:bg-gray-50 disabled:opacity-60"
          placeholder="seu@email.com"
        />
      </div>

      <div>
        <label htmlFor="password" className="mb-1 block text-sm font-medium text-gray-700">
          Senha
        </label>
        <input
          id="password"
          type="password"
          autoComplete="current-password"
          required
          disabled={loading}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 disabled:bg-gray-50 disabled:opacity-60"
          placeholder="Sua senha"
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-lg bg-brand-600 py-2.5 text-sm font-medium text-white hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        Entrar
      </button>

      <div className="flex justify-between text-sm">
        <Link href="/forgot-password" className="text-brand-600 hover:underline">
          Esqueci a senha
        </Link>
        <Link href="/register" className="text-brand-600 hover:underline">
          Cadastrar reforço
        </Link>
      </div>
    </form>
    </>
  );
}
