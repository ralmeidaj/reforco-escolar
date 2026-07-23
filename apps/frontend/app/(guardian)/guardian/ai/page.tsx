'use client';

import { useEffect, useState } from 'react';
import { api } from '../../../lib/api';

interface Panorama {
  id: string;
  subjectId: string;
  strengths: string[];
  needsReview: string[];
  level: string;
  summary: string | null;
  generatedAt: string;
}

interface Student {
  id: string;
  name: string;
}

const LEVEL_COLOR: Record<string, string> = {
  iniciante: 'bg-gray-100 text-gray-600',
  basico: 'bg-blue-100 text-blue-700',
  intermediario: 'bg-indigo-100 text-indigo-700',
  avancado: 'bg-green-100 text-green-700',
};

export default function GuardianAiPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [selected, setSelected] = useState<string>('');
  const [panoramas, setPanoramas] = useState<Panorama[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingStudents, setLoadingStudents] = useState(true);

  useEffect(() => {
    api.get('/guardian-students/my-students')
      .then((r) => {
        setStudents(r.data);
        if (r.data.length > 0) setSelected(r.data[0].id);
      })
      .finally(() => setLoadingStudents(false));
  }, []);

  useEffect(() => {
    if (!selected) return;
    setLoading(true);
    api.get(`/ai/panorama/${selected}`)
      .then((r) => setPanoramas(r.data))
      .finally(() => setLoading(false));
  }, [selected]);

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Panorama do Aluno</h1>

      {/* Seletor de filho */}
      {loadingStudents ? (
        <div className="h-10 w-48 bg-gray-100 animate-pulse rounded-lg mb-6" />
      ) : students.length > 1 && (
        <div className="mb-6">
          <label className="block text-sm text-gray-600 mb-1">Aluno</label>
          <select value={selected} onChange={(e) => setSelected(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400">
            {students.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <div key={i} className="h-28 bg-gray-100 animate-pulse rounded-xl" />)}
        </div>
      ) : panoramas.length === 0 ? (
        <div className="p-8 text-center bg-gray-50 rounded-xl text-gray-500 text-sm">
          Nenhum panorama disponível. O professor pode gerar a análise após algumas aulas.
        </div>
      ) : (
        <div className="space-y-4">
          {panoramas.map((p) => (
            <div key={p.id} className="p-5 bg-white border border-gray-200 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${LEVEL_COLOR[p.level ?? ''] ?? 'bg-gray-100 text-gray-600'}`}>
                  {p.level ?? 'Sem nível'}
                </span>
                <span className="text-xs text-gray-400">
                  Atualizado em {new Date(p.generatedAt).toLocaleDateString('pt-BR')}
                </span>
              </div>

              {p.summary && (
                <p className="text-sm text-gray-700 italic border-l-4 border-indigo-300 pl-3">"{p.summary}"</p>
              )}

              <div className="grid grid-cols-2 gap-3">
                {p.strengths.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-green-700 mb-2">✅ Pontos fortes</p>
                    <div className="flex flex-wrap gap-1">
                      {p.strengths.map((s) => (
                        <span key={s} className="px-2 py-0.5 bg-green-50 text-green-700 rounded-full text-xs">{s}</span>
                      ))}
                    </div>
                  </div>
                )}
                {p.needsReview.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-amber-700 mb-2">⚠️ Para reforçar</p>
                    <div className="flex flex-wrap gap-1">
                      {p.needsReview.map((s) => (
                        <span key={s} className="px-2 py-0.5 bg-amber-50 text-amber-700 rounded-full text-xs">{s}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
