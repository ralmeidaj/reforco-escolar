'use client';

import { useState, useEffect } from 'react';
import { api } from '@/app/lib/api';

interface Progress {
  id: string;
  subjectId: string;
  level: string;
  notes: string | null;
  updatedAt: string;
  subject?: { name: string };
}

const LEVEL_LABELS: Record<string, string> = {
  iniciante: 'Iniciante', basico: 'Básico', intermediario: 'Intermediário', avancado: 'Avançado',
};
const LEVEL_COLORS: Record<string, string> = {
  iniciante: 'bg-gray-100 text-gray-600',
  basico: 'bg-blue-100 text-blue-700',
  intermediario: 'bg-amber-100 text-amber-700',
  avancado: 'bg-emerald-100 text-emerald-700',
};
const LEVEL_BAR: Record<string, { width: string; color: string }> = {
  iniciante:    { width: 'w-1/4',  color: 'bg-gray-400' },
  basico:       { width: 'w-2/4',  color: 'bg-blue-500' },
  intermediario:{ width: 'w-3/4',  color: 'bg-amber-500' },
  avancado:     { width: 'w-full', color: 'bg-emerald-500' },
};

export default function StudentProgressPage() {
  const [items, setItems] = useState<Progress[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<{ id: string }>('/auth/me')
      .then(({ data }) => api.get<Progress[]>(`/progress/student/${data.id}`))
      .then(({ data }) => setItems(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Minha Evolução</h1>
        <p className="mt-1 text-sm text-gray-500">Nível de progresso por disciplina</p>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => <div key={i} className="h-24 animate-pulse rounded-2xl bg-gray-100" />)}
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl bg-white p-8 text-center shadow-sm">
          <p className="text-sm text-gray-500">Nenhum registro de progresso ainda. Seu professor atualizará seu nível após as aulas.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {items.map((p) => {
            const bar = LEVEL_BAR[p.level] ?? { width: 'w-1/4', color: 'bg-gray-400' };
            return (
              <div key={p.id} className="rounded-2xl bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-gray-800">
                    {p.subject?.name ?? p.subjectId}
                  </span>
                  <span className={`rounded-full px-3 py-1 text-xs font-medium ${LEVEL_COLORS[p.level] ?? 'bg-gray-100 text-gray-600'}`}>
                    {LEVEL_LABELS[p.level] ?? p.level}
                  </span>
                </div>
                <div className="mt-3 h-2 w-full rounded-full bg-gray-100">
                  <div className={`h-2 rounded-full transition-all ${bar.width} ${bar.color}`} />
                </div>
                {p.notes && (
                  <p className="mt-3 text-xs text-gray-500">{p.notes}</p>
                )}
                <p className="mt-2 text-[11px] text-gray-400">
                  Atualizado em {new Date(p.updatedAt).toLocaleDateString('pt-BR')}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
