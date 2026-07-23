'use client';

import { useEffect, useState } from 'react';
import { api } from '../../../lib/api';

interface Panorama {
  id: string;
  subjectId: string;
  strengths: string[];
  needsReview: string[];
  neverStudied: string[];
  level: string;
  summary: string | null;
  generatedAt: string;
}

interface Activity {
  id: string;
  title: string;
  content: string;
  type: string;
  createdAt: string;
}

const LEVEL_LABEL: Record<string, string> = {
  iniciante: 'Iniciante',
  basico: 'Básico',
  intermediario: 'Intermediário',
  avancado: 'Avançado',
};

const TYPE_ICON: Record<string, string> = {
  quiz: '🧠',
  exercicio: '📝',
  desafio: '🏆',
};

export default function StudentAiPage() {
  const [panoramas, setPanoramas] = useState<Panorama[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      api.get('/ai/panorama/me').then((r) => setPanoramas(r.data)),
      api.get('/ai/activities/me').then((r) => setActivities(r.data)),
    ]).finally(() => setLoading(false));
  }, []);

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Meu Panorama de Estudos</h1>

      {/* Panoramas por disciplina */}
      <section className="mb-8">
        <h2 className="text-lg font-semibold text-gray-700 mb-3">Análise por Disciplina</h2>

        {loading ? (
          <div className="space-y-3">
            {[1, 2].map((i) => <div key={i} className="h-28 bg-gray-100 animate-pulse rounded-xl" />)}
          </div>
        ) : panoramas.length === 0 ? (
          <div className="p-8 text-center bg-gray-50 rounded-xl text-gray-500 text-sm">
            Nenhum panorama gerado ainda. Registre alguns estudos para que seu professor possa gerar sua análise.
          </div>
        ) : (
          <div className="space-y-3">
            {panoramas.map((p) => (
              <div key={p.id} className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                <button
                  className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50 transition"
                  onClick={() => setExpanded(expanded === p.id ? null : p.id)}
                >
                  <div className="flex items-center gap-3">
                    <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded-full text-xs font-medium">
                      {LEVEL_LABEL[p.level ?? ''] ?? p.level}
                    </span>
                    <span className="text-sm text-gray-500">Atualizado em {new Date(p.generatedAt).toLocaleDateString('pt-BR')}</span>
                  </div>
                  <span className="text-gray-400">{expanded === p.id ? '▲' : '▼'}</span>
                </button>

                {expanded === p.id && (
                  <div className="px-4 pb-4 space-y-3 border-t border-gray-100">
                    {p.summary && (
                      <p className="text-sm text-gray-700 pt-3 italic">"{p.summary}"</p>
                    )}
                    {p.strengths.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-green-700 mb-1">✅ Pontos fortes</p>
                        <div className="flex flex-wrap gap-1">
                          {p.strengths.map((s) => (
                            <span key={s} className="px-2 py-0.5 bg-green-50 text-green-700 rounded-full text-xs">{s}</span>
                          ))}
                        </div>
                      </div>
                    )}
                    {p.needsReview.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-amber-700 mb-1">⚠️ Para revisar</p>
                        <div className="flex flex-wrap gap-1">
                          {p.needsReview.map((s) => (
                            <span key={s} className="px-2 py-0.5 bg-amber-50 text-amber-700 rounded-full text-xs">{s}</span>
                          ))}
                        </div>
                      </div>
                    )}
                    {p.neverStudied.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-gray-500 mb-1">📚 Não estudado ainda</p>
                        <div className="flex flex-wrap gap-1">
                          {p.neverStudied.map((s) => (
                            <span key={s} className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full text-xs">{s}</span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Atividades aprovadas */}
      <section>
        <h2 className="text-lg font-semibold text-gray-700 mb-3">Atividades para Você</h2>
        {loading ? (
          <div className="space-y-3">
            {[1, 2].map((i) => <div key={i} className="h-20 bg-gray-100 animate-pulse rounded-xl" />)}
          </div>
        ) : activities.length === 0 ? (
          <div className="p-8 text-center bg-gray-50 rounded-xl text-gray-500 text-sm">
            Nenhuma atividade disponível no momento.
          </div>
        ) : (
          <div className="space-y-3">
            {activities.map((a) => (
              <div key={a.id} className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                <button
                  className="w-full flex items-center gap-3 p-4 text-left hover:bg-gray-50 transition"
                  onClick={() => setExpanded(expanded === `act-${a.id}` ? null : `act-${a.id}`)}
                >
                  <span className="text-2xl">{TYPE_ICON[a.type] ?? '📄'}</span>
                  <div className="flex-1">
                    <p className="font-medium text-gray-800 text-sm">{a.title}</p>
                    <p className="text-xs text-gray-500">{new Date(a.createdAt).toLocaleDateString('pt-BR')}</p>
                  </div>
                  <span className="text-gray-400">{expanded === `act-${a.id}` ? '▲' : '▼'}</span>
                </button>
                {expanded === `act-${a.id}` && (
                  <div className="px-4 pb-4 border-t border-gray-100">
                    <pre className="mt-3 text-sm text-gray-700 whitespace-pre-wrap font-sans">{a.content}</pre>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
