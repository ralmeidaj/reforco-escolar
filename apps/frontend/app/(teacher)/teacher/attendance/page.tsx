'use client';

import { useState, useEffect } from 'react';
import { api } from '@/app/lib/api';

interface Session {
  id: string;
  scheduledAt: string;
  subject?: { name: string };
  student?: { id: string; name: string };
}

interface Attendance {
  id: string;
  studentId: string;
  status: 'presente' | 'ausente' | 'justificado';
}

const STATUS_LABELS: Record<string, string> = {
  presente: 'Presente',
  ausente: 'Ausente',
  justificado: 'Justificado',
};

const STATUS_COLORS: Record<string, string> = {
  presente: 'bg-emerald-100 text-emerald-700',
  ausente: 'bg-red-100 text-red-700',
  justificado: 'bg-amber-100 text-amber-700',
};

export default function TeacherAttendancePage() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [selectedSession, setSelectedSession] = useState<string>('');
  const [attendances, setAttendances] = useState<Attendance[]>([]);
  const [students, setStudents] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [noteContent, setNoteContent] = useState('');
  const [savingNote, setSavingNote] = useState(false);

  const today = new Date().toISOString().slice(0, 10);

  useEffect(() => {
    api
      .get<Session[]>(`/sessions?date=${today}`)
      .then(({ data }) => setSessions(data))
      .finally(() => setLoading(false));
  }, [today]);

  useEffect(() => {
    if (!selectedSession) return;
    api.get<Attendance[]>(`/attendances/session/${selectedSession}`).then(({ data }) => {
      setAttendances(data);
    });
    const session = sessions.find((s) => s.id === selectedSession);
    if (session?.student) setStudents([session.student]);
  }, [selectedSession, sessions]);

  async function setStatus(studentId: string, status: string) {
    setSaving(studentId);
    try {
      const { data } = await api.post<Attendance>('/attendances', {
        sessionId: selectedSession,
        studentId,
        status,
      });
      setAttendances((prev) => {
        const idx = prev.findIndex((a) => a.studentId === studentId);
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = data;
          return next;
        }
        return [...prev, data];
      });
    } finally {
      setSaving(null);
    }
  }

  function currentStatus(studentId: string): string {
    return attendances.find((a) => a.studentId === studentId)?.status ?? 'presente';
  }

  async function saveNote() {
    if (!selectedSession || !noteContent.trim()) return;
    setSavingNote(true);
    try {
      await api.post('/session-notes', { sessionId: selectedSession, content: noteContent });
      setNoteContent('');
    } finally {
      setSavingNote(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 animate-pulse rounded bg-gray-200" />
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-16 animate-pulse rounded-2xl bg-gray-100" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Lista de Presença</h1>
        <p className="mt-1 text-sm text-gray-500">Registre a presença dos alunos por sessão</p>
      </div>

      <div className="rounded-2xl bg-white p-5 shadow-sm">
        <label className="block text-sm font-medium text-gray-700 mb-1">Sessão de hoje</label>
        <select
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-600"
          value={selectedSession}
          onChange={(e) => setSelectedSession(e.target.value)}
        >
          <option value="">Selecione uma sessão</option>
          {sessions.map((s) => (
            <option key={s.id} value={s.id}>
              {new Date(s.scheduledAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
              {s.subject ? ` — ${s.subject.name}` : ''}
              {s.student ? ` · ${s.student.name}` : ''}
            </option>
          ))}
        </select>
      </div>

      {selectedSession && students.length > 0 && (
        <div className="rounded-2xl bg-white p-5 shadow-sm space-y-3">
          <h2 className="text-sm font-semibold text-gray-700">Alunos</h2>
          {students.map((student) => {
            const status = currentStatus(student.id);
            return (
              <div key={student.id} className="flex items-center justify-between gap-4">
                <span className="text-sm text-gray-900">{student.name}</span>
                <div className="flex gap-2">
                  {(['presente', 'ausente', 'justificado'] as const).map((s) => (
                    <button
                      key={s}
                      disabled={saving === student.id}
                      onClick={() => setStatus(student.id, s)}
                      className={`rounded-full px-3 py-1 text-xs font-medium transition-opacity disabled:opacity-50 ${
                        status === s ? STATUS_COLORS[s] : 'bg-gray-100 text-gray-500'
                      }`}
                    >
                      {STATUS_LABELS[s]}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {selectedSession && (
        <div className="rounded-2xl bg-white p-5 shadow-sm space-y-3">
          <h2 className="text-sm font-semibold text-gray-700">Nota de aula</h2>
          <textarea
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-600"
            rows={4}
            placeholder="Descreva o conteúdo abordado, dificuldades observadas..."
            value={noteContent}
            onChange={(e) => setNoteContent(e.target.value)}
          />
          <button
            disabled={savingNote || !noteContent.trim()}
            onClick={saveNote}
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
          >
            {savingNote ? 'Salvando...' : 'Salvar nota'}
          </button>
        </div>
      )}

      {selectedSession && sessions.length === 0 && (
        <div className="rounded-2xl bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-400">Nenhuma sessão encontrada para hoje.</p>
        </div>
      )}
    </div>
  );
}
