'use client';

import { useState, useEffect } from 'react';
import { api } from '@/app/lib/api';

interface Balance { lessonsRemaining: number; lowBalance: boolean }
interface StudentPlan { id: string; lessonsTotal: number; lessonsUsed: number; active: boolean; enrolledAt: string; plan?: { name: string; price: number } }
interface Payment { id: string; amount: number; status: string; method: string | null; paidAt: string | null; createdAt: string }
interface Student { id: string; name: string }

const STATUS_COLORS: Record<string, string> = {
  pago: 'bg-emerald-100 text-emerald-700',
  pendente: 'bg-amber-100 text-amber-700',
  cancelado: 'bg-gray-100 text-gray-500',
};

export default function GuardianFinancePage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [selected, setSelected] = useState('');
  const [balance, setBalance] = useState<Balance | null>(null);
  const [plans, setPlans] = useState<StudentPlan[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingStudent, setLoadingStudent] = useState(false);

  useEffect(() => {
    api.get<Student[]>('/guardian/students')
      .then(({ data }) => { setStudents(data); if (data.length > 0) setSelected(data[0].id); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!selected) return;
    setLoadingStudent(true);
    Promise.all([
      api.get<Balance>(`/student-plans/balance/${selected}`),
      api.get<StudentPlan[]>(`/student-plans/student/${selected}`),
      api.get<Payment[]>(`/payments/student/${selected}`),
    ])
      .then(([b, p, pay]) => { setBalance(b.data); setPlans(p.data); setPayments(pay.data); })
      .finally(() => setLoadingStudent(false));
  }, [selected]);

  if (loading) return (
    <div className="space-y-4">
      {[...Array(3)].map((_, i) => <div key={i} className="h-16 animate-pulse rounded-2xl bg-gray-100" />)}
    </div>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Financeiro</h1>
        <p className="mt-1 text-sm text-gray-500">Saldo de aulas e histórico de pagamentos</p>
      </div>

      {students.length > 1 && (
        <div className="rounded-2xl bg-white p-4 shadow-sm">
          <select value={selected} onChange={(e) => setSelected(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-600">
            {students.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
      )}

      {loadingStudent ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => <div key={i} className="h-14 animate-pulse rounded-2xl bg-gray-100" />)}
        </div>
      ) : balance && (
        <>
          <div className={`rounded-2xl p-5 shadow-sm ${balance.lowBalance ? 'bg-amber-50 border border-amber-200' : 'bg-white'}`}>
            <p className="text-xs font-medium text-gray-500">Saldo de aulas restantes</p>
            <p className={`mt-1 text-3xl font-bold ${balance.lowBalance ? 'text-amber-600' : 'text-gray-900'}`}>
              {balance.lessonsRemaining}
            </p>
            {balance.lowBalance && (
              <p className="mt-1 text-sm text-amber-600">Atenção: poucas aulas restantes. Entre em contato para renovar.</p>
            )}
          </div>

          {plans.length > 0 && (
            <div className="space-y-2">
              <h2 className="text-sm font-semibold text-gray-700">Pacotes contratados</h2>
              {plans.map((sp) => (
                <div key={sp.id} className="rounded-2xl bg-white p-4 shadow-sm flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{sp.plan?.name ?? 'Pacote'}</p>
                    <p className="text-xs text-gray-500">
                      {sp.lessonsUsed}/{sp.lessonsTotal} aulas usadas
                      {sp.plan?.price ? ` · R$ ${Number(sp.plan.price).toFixed(2)}` : ''}
                    </p>
                  </div>
                  <div className="w-24 rounded-full bg-gray-100 h-2 overflow-hidden">
                    <div className="h-2 rounded-full bg-brand-600 transition-all"
                      style={{ width: `${Math.min(100, (sp.lessonsUsed / sp.lessonsTotal) * 100)}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="space-y-2">
            <h2 className="text-sm font-semibold text-gray-700">Histórico de pagamentos</h2>
            {payments.length === 0 ? (
              <div className="rounded-2xl bg-white p-5 shadow-sm">
                <p className="text-sm text-gray-400">Nenhum pagamento registrado.</p>
              </div>
            ) : payments.map((pay) => (
              <div key={pay.id} className="rounded-2xl bg-white p-4 shadow-sm flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900">R$ {Number(pay.amount).toFixed(2)}</p>
                  <p className="text-xs text-gray-500">
                    {pay.method ?? '—'}
                    {pay.paidAt ? ` · Pago em ${new Date(pay.paidAt).toLocaleDateString('pt-BR')}` : ` · ${new Date(pay.createdAt).toLocaleDateString('pt-BR')}`}
                  </p>
                </div>
                <span className={`rounded-full px-3 py-1 text-xs font-medium ${STATUS_COLORS[pay.status] ?? 'bg-gray-100 text-gray-600'}`}>
                  {pay.status}
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
