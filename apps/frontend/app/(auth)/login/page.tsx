'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api, setTenantSlug } from '@/app/lib/api';
import { LoadingOverlay } from '@/app/components/LoadingOverlay';
import type { AuthResponse, UserRole } from '@/app/lib/types';

const ROLE_REDIRECTS: Record<UserRole, string> = {
  tenant_admin: '/admin',
  teacher: '/teacher',
  student: '/student',
  guardian: '/guardian',
};

export default function LoginPage() {
  const router = useRouter();
  const [slug, setSlug] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      setTenantSlug(slug.trim());
      const { data } = await api.post<AuthResponse>('/auth/login', { email, password });
      await fetch('/api/auth/callback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accessToken: data.accessToken, refreshToken: data.refreshToken }),
      });
      window.location.assign(ROLE_REDIRECTS[data.user.role] ?? '/');
    } catch (err: any) {
      const msg = Array.isArray(err.response?.data?.message)
        ? err.response.data.message.join(', ')
        : (err.response?.data?.message ?? err.message ?? 'E-mail ou senha incorretos');
      setError(msg);
    } finally {
      setLoading(false);
    }
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
        <label htmlFor="slug" className="mb-1 block text-sm font-medium text-gray-700">
          Código do reforço
        </label>
        <input
          id="slug"
          type="text"
          required
          disabled={loading}
          value={slug}
          onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/\s+/g, '-'))}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-mono focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 disabled:bg-gray-50 disabled:opacity-60"
          placeholder="ex.: clube-estudo"
        />
      </div>

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
