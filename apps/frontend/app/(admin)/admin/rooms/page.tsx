'use client';

import { useState, useEffect } from 'react';
import { api } from '@/app/lib/api';
import { Spinner } from '@/app/components/Spinner';
import { cn } from '@/app/lib/utils';

interface Room {
  id: string;
  name: string;
  capacity: number;
  currentOccupancy?: number;
  fixedGroup?: { id: string; name: string } | null;
}

export default function RoomsPage() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: '', capacity: 10 });
  const [error, setError] = useState('');

  function loadRooms() {
    return api.get<Room[]>('/rooms/occupancy').then(({ data }) => setRooms(data));
  }

  useEffect(() => {
    loadRooms().finally(() => setLoading(false));

    // Atualiza ocupação a cada 30s
    const interval = setInterval(loadRooms, 30_000);
    return () => clearInterval(interval);
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      await api.post('/rooms', form);
      await loadRooms();
      setForm({ name: '', capacity: 10 });
    } catch (err: any) {
      setError(err.response?.data?.message ?? 'Erro ao criar sala');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    await api.delete(`/rooms/${id}`);
    setRooms((prev) => prev.filter((r) => r.id !== id));
  }

  function occupancyColor(current: number, capacity: number) {
    const pct = current / capacity;
    if (pct >= 1) return 'bg-red-100 text-red-700';
    if (pct >= 0.75) return 'bg-amber-100 text-amber-700';
    return 'bg-emerald-100 text-emerald-700';
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Salas</h1>
        <p className="mt-1 text-sm text-gray-500">Gerencie as salas e veja a ocupação em tempo real</p>
      </div>

      <div className="rounded-2xl bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-sm font-semibold text-gray-700">Nova sala</h2>
        <form onSubmit={handleCreate} className="flex flex-wrap gap-3">
          <input
            required
            disabled={saving}
            value={form.name}
            onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
            placeholder="Ex.: Sala 01"
            className="flex-1 min-w-48 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 disabled:opacity-60"
          />
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-500">Capacidade:</label>
            <input
              type="number"
              min={1}
              max={50}
              disabled={saving}
              value={form.capacity}
              onChange={(e) => setForm((p) => ({ ...p, capacity: Number(e.target.value) }))}
              className="w-20 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 disabled:opacity-60"
            />
          </div>
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {saving ? <><Spinner size="sm" className="text-white" /> Salvando...</> : 'Adicionar'}
          </button>
        </form>
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      </div>

      <div className="rounded-2xl bg-white shadow-sm">
        {loading ? (
          <div className="flex items-center justify-center p-12">
            <Spinner size="lg" className="text-brand-600" />
          </div>
        ) : rooms.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-sm text-gray-400">Nenhuma sala cadastrada ainda.</p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {rooms.map((r) => {
              const occ = r.currentOccupancy ?? 0;
              return (
                <li key={r.id} className="flex items-center gap-4 px-5 py-3">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">{r.name}</p>
                    {r.fixedGroup && (
                      <p className="text-xs text-gray-400">Turma fixa: {r.fixedGroup.name}</p>
                    )}
                  </div>

                  {/* Barra de ocupação */}
                  <div className="flex w-32 flex-col gap-1">
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>{occ} / {r.capacity}</span>
                      <span className={cn('rounded-full px-1.5 py-0.5 text-xs font-medium', occupancyColor(occ, r.capacity))}>
                        {occ >= r.capacity ? 'Cheio' : occ === 0 ? 'Vazia' : 'Ocupada'}
                      </span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-gray-200">
                      <div
                        className={cn('h-1.5 rounded-full transition-all', occ >= r.capacity ? 'bg-red-500' : occ / r.capacity >= 0.75 ? 'bg-amber-400' : 'bg-emerald-500')}
                        style={{ width: `${Math.min(100, (occ / r.capacity) * 100)}%` }}
                      />
                    </div>
                  </div>

                  <button
                    onClick={() => handleDelete(r.id)}
                    className="text-xs text-red-500 hover:text-red-700"
                  >
                    Remover
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
