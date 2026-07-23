'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { saApi, loadSaToken } from '../../../lib/sa-api';

interface Stats {
  total: number;
  active: number;
  suspended: number;
  deleted: number;
}

interface Me {
  name: string;
  email: string;
  totpEnabled: boolean;
}

const KPI_SKELETON = 'h-20 bg-gray-200 animate-pulse rounded-xl';

export default function SuperAdminDashboard() {
  const router = useRouter();
  const [stats, setStats] = useState<Stats | null>(null);
  const [me, setMe] = useState<Me | null>(null);

  useEffect(() => {
    loadSaToken();
    Promise.all([
      saApi.get('/tenants/stats').then((r) => setStats(r.data)),
      saApi.get('/auth/me').then((r) => setMe(r.data)),
    ]).catch(() => router.push('/super-admin/login'));
  }, []);

  function handleLogout() {
    sessionStorage.removeItem('sa_token');
    router.push('/super-admin/login');
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🔐</span>
          <h1 className="text-lg font-bold text-gray-900">Super Admin</h1>
        </div>
        <div className="flex items-center gap-4">
          {me && (
            <span className="text-gray-500 text-sm">
              {me.name} {me.totpEnabled ? '🔒' : '⚠️'}
            </span>
          )}
          <nav className="flex gap-4">
            <button onClick={() => router.push('/super-admin/tenants')} className="cursor-pointer text-gray-600 hover:text-blue-600 text-sm font-medium transition">Reforços</button>
            <button onClick={() => router.push('/super-admin/plans')} className="cursor-pointer text-gray-600 hover:text-blue-600 text-sm font-medium transition">Planos</button>
          </nav>
          <button onClick={handleLogout} className="cursor-pointer text-red-500 hover:text-red-700 text-sm font-medium transition">Sair</button>
        </div>
      </header>

      <main className="p-6 max-w-5xl mx-auto">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Dashboard Global</h2>

        {!me?.totpEnabled && (
          <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-xl text-yellow-700 text-sm">
            ⚠️ TOTP não está ativado. Configure a autenticação de dois fatores em Configurações.
          </div>
        )}

        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {stats ? (
            <>
              <KpiCard label="Total de Tenants" value={stats.total} color="blue" />
              <KpiCard label="Ativos" value={stats.active} color="green" />
              <KpiCard label="Suspensos" value={stats.suspended} color="yellow" />
              <KpiCard label="Excluídos" value={stats.deleted} color="red" />
            </>
          ) : (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className={KPI_SKELETON} />
            ))
          )}
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <ActionCard
            icon="🏫"
            title="Gerenciar Reforços"
            description="Ativar, suspender ou excluir reforços. Atribuir planos SaaS."
            onClick={() => router.push('/super-admin/tenants')}
          />
          <ActionCard
            icon="💳"
            title="Planos SaaS"
            description="Criar e gerenciar planos de assinatura da plataforma."
            onClick={() => router.push('/super-admin/plans')}
          />
        </div>
      </main>
    </div>
  );
}

function KpiCard({ label, value, color }: { label: string; value: number; color: string }) {
  const colors: Record<string, string> = {
    blue: 'text-blue-600 bg-blue-50 border-blue-200',
    green: 'text-green-600 bg-green-50 border-green-200',
    yellow: 'text-yellow-600 bg-yellow-50 border-yellow-200',
    red: 'text-red-600 bg-red-50 border-red-200',
  };
  return (
    <div className={`border rounded-xl p-4 ${colors[color]}`}>
      <div className="text-3xl font-bold">{value}</div>
      <div className="text-sm mt-1 text-gray-600">{label}</div>
    </div>
  );
}

function ActionCard({ icon, title, description, onClick }: {
  icon: string;
  title: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="cursor-pointer text-left p-6 bg-white border border-gray-200 rounded-xl hover:border-blue-400 hover:shadow-md transition"
    >
      <div className="text-3xl mb-3">{icon}</div>
      <h3 className="font-semibold text-gray-900 mb-1">{title}</h3>
      <p className="text-gray-500 text-sm">{description}</p>
    </button>
  );
}
