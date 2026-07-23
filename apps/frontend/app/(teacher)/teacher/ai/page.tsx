'use client';

import { useEffect, useState } from 'react';
import { api } from '../../../lib/api';

interface Group {
  topic: string;
  studentIds: string[];
}

interface Suggestion {
  id: string;
  studentId: string;
  subjectId: string;
  title: string;
  content: string;
  type: string;
  status: string;
  createdAt: string;
}

interface Student {
  id: string;
  name: string;
}

const TYPE_ICON: Record<string, string> = { quiz: '🧠', exercicio: '📝', desafio: '🏆' };
const SKELETON = 'h-16 bg-gray-100 animate-pulse rounded-xl';

export default function TeacherAiPage() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [reviewing, setReviewing] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [genForm, setGenForm] = useState({ studentId: '', subjectId: '', type: 'exercicio' });
  const [genError, setGenError] = useState('');

  useEffect(() => {
    Promise.all([
      api.get('/ai/groups/by-topic').then((r) => setGroups(r.data)),
      api.get('/ai/activities/review').then((r) => setSuggestions(r.data)),
      api.get('/auth/users?role=student').then((r) => setStudents(r.data)),
    ]).finally(() => setLoading(false));
  }, []);

  async function handleReview(id: string, status: 'approved' | 'rejected') {
    setReviewing(id);
    try {
      await api.patch(`/ai/activities/${id}/review`, { status });
      setSuggestions((prev) => prev.filter((s) => s.id !== id));
    } finally {
      setReviewing(null);
    }
  }

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault();
    if (!genForm.studentId || !genForm.subjectId) return;
    setGenerating(true);
    setGenError('');
    try {
      const res = await api.post(`/ai/activities/generate/${genForm.studentId}`, {
        subjectId: genForm.subjectId,
        type: genForm.type,
      });
      setSuggestions((prev) => [res.data, ...prev]);
    } catch (e: any) {
      setGenError(e.response?.data?.message ?? 'Erro ao gerar atividade');
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">IA Pedagógica</h1>

      {/* Gerar atividade */}
      <section className="mb-8 p-5 bg-indigo-50 border border-indigo-200 rounded-xl">
        <h2 className="font-semibold text-indigo-800 mb-3">Gerar Atividade para Aluno</h2>
        <form onSubmit={handleGenerate} className="flex flex-wrap gap-3 items-end">
          <div>
            <label className="block text-xs text-gray-600 mb-1">Aluno</label>
            <select value={genForm.studentId} onChange={(e) => setGenForm({ ...genForm, studentId: e.target.value })}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400">
              <option value="">Selecione...</option>
              {students.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-600 mb-1">ID da Disciplina</label>
            <input value={genForm.subjectId} onChange={(e) => setGenForm({ ...genForm, subjectId: e.target.value })}
              placeholder="UUID da disciplina"
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 w-52" />
          </div>
          <div>
            <label className="block text-xs text-gray-600 mb-1">Tipo</label>
            <select value={genForm.type} onChange={(e) => setGenForm({ ...genForm, type: e.target.value })}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none">
              <option value="exercicio">Exercício</option>
              <option value="quiz">Quiz</option>
              <option value="desafio">Desafio</option>
            </select>
          </div>
          <button type="submit" disabled={generating || !genForm.studentId || !genForm.subjectId}
            className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition disabled:opacity-60">
            {generating ? 'Gerando...' : 'Gerar'}
          </button>
        </form>
        {genError && <p className="text-red-600 text-xs mt-2">{genError}</p>}
      </section>

      {/* Agrupamentos */}
      <section className="mb-8">
        <h2 className="text-lg font-semibold text-gray-700 mb-3">Alunos com Tópicos em Comum</h2>
        {loading ? (
          <div className="space-y-2">{[1, 2, 3].map((i) => <div key={i} className={SKELETON} />)}</div>
        ) : groups.length === 0 ? (
          <p className="text-sm text-gray-500 p-4 bg-gray-50 rounded-xl">Nenhum tópico em comum identificado ainda.</p>
        ) : (
          <div className="grid gap-2">
            {groups.map((g) => (
              <div key={g.topic} className="flex items-center gap-3 p-3 bg-white border border-gray-200 rounded-xl">
                <span className="font-medium text-gray-800 text-sm flex-1">{g.topic}</span>
                <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded-full text-xs">
                  {g.studentIds.length} alunos
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Atividades para revisar */}
      <section>
        <h2 className="text-lg font-semibold text-gray-700 mb-3">
          Atividades Aguardando Revisão
          {suggestions.length > 0 && (
            <span className="ml-2 px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full text-xs">{suggestions.length}</span>
          )}
        </h2>
        {loading ? (
          <div className="space-y-2">{[1, 2].map((i) => <div key={i} className="h-20 bg-gray-100 animate-pulse rounded-xl" />)}</div>
        ) : suggestions.length === 0 ? (
          <p className="text-sm text-gray-500 p-4 bg-gray-50 rounded-xl">Nenhuma atividade aguardando revisão.</p>
        ) : (
          <div className="space-y-3">
            {suggestions.map((s) => (
              <div key={s.id} className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                <button className="w-full flex items-center gap-3 p-4 text-left hover:bg-gray-50 transition"
                  onClick={() => setExpanded(expanded === s.id ? null : s.id)}>
                  <span className="text-xl">{TYPE_ICON[s.type] ?? '📄'}</span>
                  <div className="flex-1">
                    <p className="font-medium text-gray-800 text-sm">{s.title}</p>
                    <p className="text-xs text-gray-500">{new Date(s.createdAt).toLocaleDateString('pt-BR')}</p>
                  </div>
                  <span className="text-gray-400">{expanded === s.id ? '▲' : '▼'}</span>
                </button>
                {expanded === s.id && (
                  <div className="px-4 pb-4 border-t border-gray-100">
                    <pre className="mt-3 text-sm text-gray-700 whitespace-pre-wrap font-sans mb-4">{s.content}</pre>
                    <div className="flex gap-3">
                      <button onClick={() => handleReview(s.id, 'approved')} disabled={reviewing === s.id}
                        className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm transition disabled:opacity-60">
                        {reviewing === s.id ? 'Salvando...' : '✅ Aprovar'}
                      </button>
                      <button onClick={() => handleReview(s.id, 'rejected')} disabled={reviewing === s.id}
                        className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm transition disabled:opacity-60">
                        {reviewing === s.id ? 'Salvando...' : '❌ Rejeitar'}
                      </button>
                    </div>
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
