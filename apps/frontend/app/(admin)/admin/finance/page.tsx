'use client';

import { useState, useEffect } from 'react';
import { api } from '@/app/lib/api';

interface Plan { id: string; name: string; totalLessons: number; price: number; active: boolean; subject?: { name: string } | null }
interface Payment { id: string; amount: number; status: string; method: string | null; dueDate: string | null; paidAt: string | null; student?: { name: string } }
interface Student { id: string; name: string }

const STATUS_COLORS: Record<string, string> = {
  pago: 'bg-emerald-100 text-emerald-700',
  pendente: 'bg-amber-100 text-amber-700',
  cancelado: 'bg-gray-100 text-gray-500',
};

export default function AdminFinancePage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'plans' | 'payments'>('plans');
  const [saving, setSaving] = useState(false);
  const [showPlanForm, setShowPlanForm] = useState(false);
  const [planForm, setPlanForm] = useState({ name: '', totalLessons: 10, price: 0 });
  const [payForm, setPayForm] = useState({ studentId: '', amount: 0, method: 'pix', status: 'pago' });
  const [showPayForm, setShowPayForm] = useState(false);
  const [error, setError] = useState('');

  const now = new Date();
  const [reportYear] = useState(now.getFullYear());
  const [reportMonth] = useState(now.getMonth() + 1);
  const [report, setReport] = useState<{ total: number; paid: number; pending: number } | null>(null);

  async function loadAll() {
    const [p, pay, s, rep] = await Promise.all([
      api.get<Plan[]>('/plans'),
      api.get<Payment[]>('/payments'),
      api.get<Student[]>('/auth/users?role=student'),
      api.get<{ total: number; paid: number; pending: number }>(`/finance/report?year=${reportYear}&month=${reportMonth}`),
    ]);
    setPlans(p.data);
    setPayments(pay.data);
    setStudents(s.data);
    setReport(rep.data);
  }

  useEffect(() => { loadAll().finally(() => setLoading(false)); }, []);

  async function handleCreatePlan(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      await api.post('/plans', planForm);
      await loadAll();
      setPlanForm({ name: '', totalLessons: 10, price: 0 });
      setShowPlanForm(false);
    } catch (err: any) { setError(err.response?.data?.message ?? 'Erro'); }
    finally { setSaving(false); }
  }

  async function handleCreatePayment(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      await api.post('/payments', payForm);
      await loadAll();
      setPayForm({ studentId: '', amount: 0, method: 'pix', status: 'pago' });
      setShowPayForm(false);
    } catch (err: any) { setError(err.response?.data?.message ?? 'Erro'); }
    finally { setSaving(false); }
  }

  if (loading) return (
    <div className="space-y-4">
      {[...Array(4)].map((_, i) => <div key={i} className="h-16 animate-pulse rounded-2xl bg-gray-100" />)}
    </div>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Financeiro</h1>
        <p className="mt-1 text-sm text-gray-500">Pacotes, matrículas e pagamentos</p>
      </div>

      {report && (
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Total do mês', value: `R$ ${report.total.toFixed(2)}`, color: 'text-gray-900' },
            { label: 'Recebido', value: `R$ ${report.paid.toFixed(2)}`, color: 'text-emerald-600' },
            { label: 'Pendente', value: `R$ ${report.pending.toFixed(2)}`, color: 'text-amber-600' },
          ].map((kpi) => (
            <div key={kpi.label} className="rounded-2xl bg-white p-4 shadow-sm">
              <p className="text-xs text-gray-500">{kpi.label}</p>
              <p className={`mt-1 text-xl font-bold ${kpi.color}`}>{kpi.value}</p>
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-2">
        {(['plans', 'payments'] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${tab === t ? 'bg-brand-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
            {t === 'plans' ? 'Pacotes' : 'Pagamentos'}
          </button>
        ))}
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {tab === 'plans' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button onClick={() => setShowPlanForm((v) => !v)} className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700">
              {showPlanForm ? 'Cancelar' : '+ Novo pacote'}
            </button>
          </div>
          {showPlanForm && (
            <form onSubmit={handleCreatePlan} className="rounded-2xl bg-white p-5 shadow-sm space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nome</label>
                  <input required type="text" value={planForm.name} onChange={(e) => setPlanForm((f) => ({ ...f, name: e.target.value }))}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-600" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nº de aulas</label>
                  <input required type="number" min={1} value={planForm.totalLessons} onChange={(e) => setPlanForm((f) => ({ ...f, totalLessons: Number(e.target.value) }))}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-600" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Preço (R$)</label>
                  <input required type="number" min={0} step="0.01" value={planForm.price} onChange={(e) => setPlanForm((f) => ({ ...f, price: Number(e.target.value) }))}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-600" />
                </div>
              </div>
              <button type="submit" disabled={saving} className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60">
                {saving ? 'Criando...' : 'Criar pacote'}
              </button>
            </form>
          )}
          <div className="space-y-2">
            {plans.map((p) => (
              <div key={p.id} className="rounded-2xl bg-white p-4 shadow-sm flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900">{p.name}</p>
                  <p className="text-xs text-gray-500">{p.totalLessons} aulas · R$ {Number(p.price).toFixed(2)}{p.subject ? ` · ${p.subject.name}` : ''}</p>
                </div>
                {!p.active && <span className="text-xs text-gray-400">Inativo</span>}
              </div>
            ))}
            {plans.length === 0 && <div className="rounded-2xl bg-white p-5 shadow-sm"><p className="text-sm text-gray-400">Nenhum pacote cadastrado.</p></div>}
          </div>
        </div>
      )}

      {tab === 'payments' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button onClick={() => setShowPayForm((v) => !v)} className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700">
              {showPayForm ? 'Cancelar' : '+ Registrar pagamento'}
            </button>
          </div>
          {showPayForm && (
            <form onSubmit={handleCreatePayment} className="rounded-2xl bg-white p-5 shadow-sm space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Aluno</label>
                  <select required value={payForm.studentId} onChange={(e) => setPayForm((f) => ({ ...f, studentId: e.target.value }))}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-600">
                    <option value="">Selecione...</option>
                    {students.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Valor (R$)</label>
                  <input required type="number" min={0} step="0.01" value={payForm.amount} onChange={(e) => setPayForm((f) => ({ ...f, amount: Number(e.target.value) }))}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-600" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Método</label>
                  <select value={payForm.method} onChange={(e) => setPayForm((f) => ({ ...f, method: e.target.value }))}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-600">
                    <option value="pix">Pix</option>
                    <option value="dinheiro">Dinheiro</option>
                    <option value="cartao">Cartão</option>
                    <option value="transferencia">Transferência</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select value={payForm.status} onChange={(e) => setPayForm((f) => ({ ...f, status: e.target.value }))}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-600">
                    <option value="pago">Pago</option>
                    <option value="pendente">Pendente</option>
                  </select>
                </div>
              </div>
              <button type="submit" disabled={saving} className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60">
                {saving ? 'Registrando...' : 'Registrar pagamento'}
              </button>
            </form>
          )}
          <div className="space-y-2">
            {payments.map((pay) => (
              <div key={pay.id} className="rounded-2xl bg-white p-4 shadow-sm flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-gray-900">{pay.student?.name ?? 'Aluno'} · R$ {Number(pay.amount).toFixed(2)}</p>
                  <p className="text-xs text-gray-500">{pay.method ?? '—'}{pay.dueDate ? ` · Vence ${new Date(pay.dueDate).toLocaleDateString('pt-BR')}` : ''}</p>
                </div>
                <span className={`rounded-full px-3 py-1 text-xs font-medium ${STATUS_COLORS[pay.status] ?? 'bg-gray-100 text-gray-600'}`}>{pay.status}</span>
              </div>
            ))}
            {payments.length === 0 && <div className="rounded-2xl bg-white p-5 shadow-sm"><p className="text-sm text-gray-400">Nenhum pagamento registrado.</p></div>}
          </div>
        </div>
      )}
    </div>
  );
}
