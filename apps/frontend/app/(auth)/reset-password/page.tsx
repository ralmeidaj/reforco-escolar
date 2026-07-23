'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/app/lib/api';
import { Spinner } from '@/app/components/Spinner';

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token') ?? '';

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) {
      setError('As senhas não coincidem');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await api.post('/auth/reset-password', { token, password });
      router.push('/login?reset=1');
    } catch (err: any) {
      setError(err.response?.data?.message ?? 'Token inválido ou expirado');
    } finally {
      setLoading(false);
    }
  }

  if (!token) {
    return (
      <div className="space-y-3 text-center">
        <p className="text-sm text-red-600">Link de redefinição inválido.</p>
        <Link href="/login" className="text-sm text-brand-600 hover:underline">Voltar ao login</Link>
      </div>
    );
  }

  const inputCls = 'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 disabled:bg-gray-50 disabled:opacity-60';

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">Nova senha</h2>
        <p className="mt-1 text-sm text-gray-500">Escolha uma senha forte para sua conta.</p>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</div>
      )}

      <div>
        <label htmlFor="password" className="mb-1 block text-sm font-medium text-gray-700">Nova senha</label>
        <input id="password" type="password" required minLength={8} disabled={loading} value={password} onChange={(e) => setPassword(e.target.value)} className={inputCls} placeholder="Mínimo 8 caracteres" />
      </div>

      <div>
        <label htmlFor="confirm" className="mb-1 block text-sm font-medium text-gray-700">Confirmar senha</label>
        <input id="confirm" type="password" required minLength={8} disabled={loading} value={confirm} onChange={(e) => setConfirm(e.target.value)} className={inputCls} placeholder="Repita a senha" />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand-600 py-2.5 text-sm font-medium text-white hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? <><Spinner size="sm" className="text-white" /> Salvando...</> : 'Salvar nova senha'}
      </button>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetPasswordForm />
    </Suspense>
  );
}
