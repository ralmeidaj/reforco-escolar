'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { saApi, loadSaToken } from '../../../lib/sa-api';
import { LoadingOverlay } from '@/app/components/LoadingOverlay';

interface Plan {
  id: string;
  name: string;
  type: string;
  priceMonthly: number;
  maxStudents: number;
  maxTeachers: number;
  active: boolean;
}

const TYPE_BADGE: Record<string, string> = {
  free: 'bg-gray-100 text-gray-600 border border-gray-200',
  pro: 'bg-blue-100 text-blue-700 border border-blue-200',
  enterprise: 'bg-purple-100 text-purple-700 border border-purple-200',
};

export default function SuperAdminPlans() {
  const router = useRouter();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ name: '', type: 'free', priceMonthly: 0, maxStudents: 50, maxTeachers: 5 });
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    loadSaToken();
    saApi.get('/plans').then((r) => setPlans(r.data)).catch(() => router.push('/super-admin/login')).finally(() => setLoading(false));
  }, []);

  async function createPlan(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const res = await saApi.post('/plans', form);
      setPlans((prev) => [...prev, res.data]);
      setForm({ name: '', type: 'free', priceMonthly: 0, maxStudents: 50, maxTeachers: 5 });
      setShowForm(false);
    } catch (e: any) {
      setError(e.response?.data?.message ?? 'Erro ao criar plano');
    } finally {
      setSaving(false);
    }
  }

  async function removePlan(id: string) {
    if (!confirm('Desativar este plano?')) return;
    try {
      await saApi.delete(`/plans/${id}`);
      setPlans((prev) => prev.filter((p) => p.id !== id));
    } catch {
      setError('Erro ao desativar plano');
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <LoadingOverlay visible={saving} message="Salvando..." />
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center gap-4">
        <button
          onClick={() => router.push('/super-admin/dashboard')}
          className="cursor-pointer text-gray-500 hover:text-blue-600 text-sm font-medium transition"
        >
          ← Dashboard
        </button>
        <h1 className="text-lg font-bold text-gray-900">Planos SaaS</h1>
        <div className="ml-auto">
          <button
            onClick={() => setShowForm(!showForm)}
            className="cursor-pointer px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition"
          >
            + Novo Plano
          </button>
        </div>
      </header>

      <main className="p-6 max-w-4xl mx-auto">
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">{error}</div>
        )}

        {showForm && (
          <form onSubmit={createPlan} className="mb-8 p-6 bg-white border border-gray-200 rounded-xl space-y-4">
            <h2 className="font-semibold text-gray-900 text-lg">Novo Plano</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome</label>
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Ex.: Pro Mensal"
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
                <select
                  value={form.type}
                  onChange={(e) => setForm({ ...form, type: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="free">Free</option>
                  <option value="pro">Pro</option>
                  <option value="enterprise">Enterprise</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Preço/mês (R$)</label>
                <input
                  type="number"
                  min={0}
                  value={form.priceMonthly}
                  onChange={(e) => setForm({ ...form, priceMonthly: Number(e.target.value) })}
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Máx. alunos</label>
                <input
                  type="number"
                  min={1}
                  value={form.maxStudents}
                  onChange={(e) => setForm({ ...form, maxStudents: Number(e.target.value) })}
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div className="flex gap-3">
              <button
                type="submit"
                disabled={saving}
                className="cursor-pointer px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition disabled:opacity-60"
              >
                Criar Plano
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
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-24 bg-gray-200 animate-pulse rounded-xl" />
            ))}
          </div>
        ) : (
          <div className="grid gap-4">
            {plans.map((plan) => (
              <div key={plan.id} className="p-5 bg-white border border-gray-200 rounded-xl flex items-center justify-between hover:border-blue-200 transition">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-semibold text-gray-900">{plan.name}</h3>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${TYPE_BADGE[plan.type] ?? 'bg-gray-100 text-gray-600'}`}>
                      {plan.type.toUpperCase()}
                    </span>
                  </div>
                  <div className="text-sm text-gray-500 flex gap-4">
                    <span>R$ {Number(plan.priceMonthly).toFixed(2)}/mês</span>
                    <span>Até {plan.maxStudents} alunos</span>
                    <span>Até {plan.maxTeachers} professores</span>
                  </div>
                </div>
                <button
                  onClick={() => removePlan(plan.id)}
                  className="cursor-pointer px-3 py-1 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded text-xs transition"
                >
                  Desativar
                </button>
              </div>
            ))}
            {plans.length === 0 && (
              <div className="py-12 text-center text-gray-400">
                Nenhum plano cadastrado. Clique em "Novo Plano" para criar o primeiro.
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
