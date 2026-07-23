'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { saApi, setSaToken } from '../../../lib/sa-api';

export default function SuperAdminLogin() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [totp, setTotp] = useState('');
  const [tempToken, setTempToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await saApi.post('/auth/login', { email, password });
      const data = res.data;
      if (data.requireTotp) {
        setTempToken(data.tempToken);
      } else {
        setSaToken(data.accessToken);
        router.push('/super-admin/dashboard');
      }
    } catch (err: any) {
      setError(err.response?.data?.message ?? 'Credenciais inválidas');
    } finally {
      setLoading(false);
    }
  }

  async function handleTotp(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await saApi.post('/auth/totp/verify', { token: totp, tempToken });
      setSaToken(res.data.accessToken);
      router.push('/super-admin/dashboard');
    } catch (err: any) {
      setError('Código TOTP inválido');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen">
      {/* Painel esquerdo — gradiente azul */}
      <div className="relative hidden flex-1 flex-col items-center justify-center overflow-hidden bg-gradient-to-br from-blue-600 via-blue-500 to-sky-400 lg:flex">
        <div className="absolute -left-20 -top-20 h-96 w-96 rounded-full bg-white/5" />
        <div className="absolute -bottom-32 -right-16 h-[500px] w-[500px] rounded-full bg-white/5" />
        <div className="text-6xl mb-6">🔐</div>
        <h1 className="text-3xl font-bold text-white">Super Admin</h1>
        <p className="mt-2 text-white/75 text-sm">Painel Global — Reforços Escolares</p>
        <div className="mt-8 rounded-2xl bg-white/10 px-6 py-4 backdrop-blur-sm max-w-xs text-center">
          <p className="text-sm italic text-white/90">Área restrita para administradores da plataforma.</p>
        </div>
      </div>

      {/* Painel direito — formulário */}
      <div className="flex w-full flex-col items-center justify-center bg-gray-50 px-6 py-12 lg:w-[440px] lg:flex-none lg:px-12">
        <div className="w-full max-w-sm">
          <div className="mb-8 text-center lg:hidden">
            <span className="text-4xl">🔐</span>
            <h1 className="mt-2 text-2xl font-bold text-gray-900">Super Admin</h1>
          </div>

          <h2 className="text-2xl font-bold text-gray-900 mb-1">
            {tempToken ? 'Verificação TOTP' : 'Entrar'}
          </h2>
          <p className="text-sm text-gray-500 mb-8">
            {tempToken ? 'Insira o código do seu autenticador' : 'Acesse o painel global da plataforma'}
          </p>

          {error && (
            <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
              {error}
            </div>
          )}

          {!tempToken ? (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">E-mail</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="admin@reforcos.app"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Senha</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition disabled:opacity-60"
              >
                {loading ? 'Entrando...' : 'Entrar'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleTotp} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Código TOTP</label>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={totp}
                  onChange={(e) => setTotp(e.target.value)}
                  className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 text-center text-xl tracking-widest placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="000000"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition disabled:opacity-60"
              >
                {loading ? 'Verificando...' : 'Verificar'}
              </button>
              <button
                type="button"
                onClick={() => setTempToken(null)}
                className="w-full py-2 text-gray-500 hover:text-gray-700 text-sm transition"
              >
                ← Voltar
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
