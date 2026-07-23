'use client';

import { useState } from 'react';
import Link from 'next/link';
import { api } from '@/app/lib/api';
import { Spinner } from '@/app/components/Spinner';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.post('/auth/forgot-password', { email });
      setSent(true);
    } catch (err: any) {
      setError(err.response?.data?.message ?? 'Erro ao enviar e-mail');
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <div className="space-y-4 text-center">
        <div className="text-4xl">📧</div>
        <h2 className="text-xl font-semibold text-gray-900">Verifique seu e-mail</h2>
        <p className="text-sm text-gray-500">
          Enviamos um link para <strong>{email}</strong>. Verifique sua caixa de entrada.
        </p>
        <Link href="/login" className="block text-sm text-brand-600 hover:underline">
          Voltar ao login
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">Recuperar senha</h2>
        <p className="mt-1 text-sm text-gray-500">
          Informe seu e-mail e enviaremos um link para redefinir sua senha.
        </p>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</div>
      )}

      <div>
        <label htmlFor="email" className="mb-1 block text-sm font-medium text-gray-700">E-mail</label>
        <input
          id="email"
          type="email"
          required
          disabled={loading}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 disabled:bg-gray-50 disabled:opacity-60"
          placeholder="seu@email.com"
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand-600 py-2.5 text-sm font-medium text-white hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? <><Spinner size="sm" className="text-white" /> Enviando...</> : 'Enviar link'}
      </button>

      <p className="text-center text-sm">
        <Link href="/login" className="text-brand-600 hover:underline">Voltar ao login</Link>
      </p>
    </form>
  );
}
