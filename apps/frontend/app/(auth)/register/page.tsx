'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import axios from 'axios';
import { Spinner } from '@/app/components/Spinner';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({ schoolName: '', slug: '', name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: value,
      ...(name === 'schoolName'
        ? { slug: value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') }
        : {}),
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await axios.post(`${BASE_URL}/tenants`, { name: form.schoolName, slug: form.slug });
      await axios.post(
        `${BASE_URL}/auth/signup`,
        { name: form.name, email: form.email, password: form.password, role: 'tenant_admin' },
        { headers: { 'X-Tenant-Slug': form.slug }, withCredentials: true },
      );
      router.push('/admin');
    } catch (err: any) {
      setError(err.response?.data?.message ?? 'Erro ao criar conta');
    } finally {
      setLoading(false);
    }
  }

  const inputCls = 'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 disabled:bg-gray-50 disabled:opacity-60';

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">Criar sua escola</h2>
        <p className="mt-1 text-sm text-gray-500">Cadastre gratuitamente e comece em minutos</p>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</div>
      )}

      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">Nome da escola</label>
        <input name="schoolName" required disabled={loading} value={form.schoolName} onChange={handleChange} className={inputCls} placeholder="Reforço Silva" />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">Endereço da escola</label>
        <div className="flex items-center overflow-hidden rounded-lg border border-gray-300 focus-within:border-brand-500 focus-within:ring-1 focus-within:ring-brand-500">
          <input name="slug" required pattern="[a-z0-9-]+" disabled={loading} value={form.slug} onChange={handleChange} className="flex-1 px-3 py-2 text-sm focus:outline-none disabled:bg-gray-50 disabled:opacity-60" placeholder="reforco-silva" />
          <span className="border-l border-gray-300 bg-gray-50 px-3 py-2 text-xs text-gray-400">.app.com</span>
        </div>
      </div>

      <hr className="border-gray-100" />

      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">Seu nome</label>
        <input name="name" required disabled={loading} value={form.name} onChange={handleChange} className={inputCls} placeholder="João Silva" />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">E-mail</label>
        <input name="email" type="email" required disabled={loading} value={form.email} onChange={handleChange} className={inputCls} placeholder="joao@escola.com" />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">Senha</label>
        <input name="password" type="password" required minLength={8} disabled={loading} value={form.password} onChange={handleChange} className={inputCls} placeholder="Mínimo 8 caracteres" />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand-600 py-2.5 text-sm font-medium text-white hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? <><Spinner size="sm" className="text-white" /> Criando conta...</> : 'Criar conta'}
      </button>

      <p className="text-center text-sm text-gray-500">
        Já tem conta?{' '}
        <Link href="/login" className="text-brand-600 hover:underline">Entrar</Link>
      </p>
    </form>
  );
}
