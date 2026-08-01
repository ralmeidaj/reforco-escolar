'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { api } from '@/app/lib/api';
import { Spinner } from '@/app/components/Spinner';

interface RoomAvailable {
  id: string;
  name: string;
  capacity: number;
  currentOccupancy: number;
  available: number;
  isFull: boolean;
}

interface ActiveCheckin {
  id: string;
  roomId: string;
  checkinAt: string;
  room: { id: string; name: string; capacity: number };
}

function OccupancyBar({ current, capacity, isFull }: { current: number; capacity: number; isFull: boolean }) {
  const pct = capacity ? Math.min(100, Math.round((current / capacity) * 100)) : 0;
  const color = isFull ? 'bg-red-500' : pct >= 75 ? 'bg-amber-400' : 'bg-emerald-500';
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
      <div className={`h-2 rounded-full transition-all duration-500 ${color}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

export default function StudentRoomsPage() {
  const [rooms, setRooms] = useState<RoomAvailable[]>([]);
  const [activeCheckin, setActiveCheckin] = useState<ActiveCheckin | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkingIn, setCheckingIn] = useState<string | null>(null);
  const [checkingOut, setCheckingOut] = useState(false);
  const [confirmRoom, setConfirmRoom] = useState<RoomAvailable | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = useCallback(async () => {
    try {
      const [roomsRes, checkinRes] = await Promise.all([
        api.get<RoomAvailable[]>('/rooms/available'),
        api.get<ActiveCheckin | null>('/rooms/my-checkin'),
      ]);
      setRooms(roomsRes.data);
      setActiveCheckin(checkinRes.data);
    } catch {}
  }, []);

  useEffect(() => {
    load().finally(() => setLoading(false));
    intervalRef.current = setInterval(load, 30_000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [load]);

  async function handleCheckin(room: RoomAvailable) {
    setConfirmRoom(null);
    setCheckingIn(room.id);
    try {
      await api.post(`/rooms/${room.id}/checkin`);
      await load();
    } catch (e: any) {
      alert(e.response?.data?.message ?? 'Não foi possível fazer o check-in');
    }
    setCheckingIn(null);
  }

  async function handleCheckout() {
    setCheckingOut(true);
    try {
      await api.delete('/rooms/my-checkin');
      await load();
    } catch {}
    setCheckingOut(false);
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-52 animate-pulse rounded bg-gray-200" />
        <div className="h-24 animate-pulse rounded-2xl bg-blue-50" />
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-28 animate-pulse rounded-2xl bg-gray-100" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Salas de hoje</h1>
        <p className="mt-1 text-sm text-gray-500">Escolha onde você vai estudar</p>
      </div>

      {/* Banner de check-in ativo */}
      {activeCheckin && (
        <div className="rounded-2xl border border-blue-200 bg-blue-50 p-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">Você está em</p>
              <p className="mt-0.5 text-xl font-bold text-gray-900">{activeCheckin.room.name}</p>
              <p className="mt-0.5 text-xs text-gray-500">
                Entrada:{' '}
                {new Date(activeCheckin.checkinAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
            <button
              onClick={handleCheckout}
              disabled={checkingOut}
              className="shrink-0 rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60 flex items-center gap-2"
            >
              {checkingOut && <Spinner size="sm" className="text-white" />}
              {checkingOut ? 'Saindo...' : 'Sair da sala'}
            </button>
          </div>
        </div>
      )}

      {/* Lista de salas */}
      {rooms.length === 0 ? (
        <div className="rounded-2xl bg-white p-8 shadow-sm text-center">
          <p className="text-3xl">🏫</p>
          <p className="mt-2 text-sm text-gray-400">Nenhuma sala disponível hoje</p>
        </div>
      ) : (
        <div className="space-y-3">
          {rooms.map((room) => {
            const isMyRoom = activeCheckin?.roomId === room.id;
            const isLoadingThis = checkingIn === room.id;
            return (
              <div
                key={room.id}
                className={`rounded-2xl bg-white p-5 shadow-sm ${isMyRoom ? 'ring-2 ring-brand-500' : ''}`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-base font-bold text-gray-900">{room.name}</span>
                      {isMyRoom && (
                        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                          ✓ Você está aqui
                        </span>
                      )}
                      {room.isFull && !isMyRoom && (
                        <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700">
                          Lotada
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-xs text-gray-500">
                      {room.currentOccupancy}/{room.capacity} alunos
                      {!room.isFull && (
                        <span className="ml-1 text-emerald-600 font-medium">
                          · {room.available} vaga{room.available !== 1 ? 's' : ''} livre{room.available !== 1 ? 's' : ''}
                        </span>
                      )}
                    </p>
                    <div className="mt-3">
                      <OccupancyBar current={room.currentOccupancy} capacity={room.capacity} isFull={room.isFull} />
                    </div>
                  </div>

                  {!isMyRoom && (
                    <button
                      onClick={() => setConfirmRoom(room)}
                      disabled={room.isFull || !!checkingIn}
                      className="shrink-0 rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-400 flex items-center gap-2"
                    >
                      {isLoadingThis && <Spinner size="sm" className="text-white" />}
                      {isLoadingThis ? 'Entrando...' : room.isFull ? 'Lotada' : 'Entrar'}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal de confirmação de check-in */}
      {confirmRoom && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
            <h2 className="text-lg font-bold text-gray-900">Entrar na sala</h2>
            <p className="mt-2 text-sm text-gray-600">
              Confirma que você vai entrar em <strong>{confirmRoom.name}</strong>?
            </p>
            <p className="mt-1 text-xs text-gray-400">
              {confirmRoom.available} vaga{confirmRoom.available !== 1 ? 's' : ''} disponível{confirmRoom.available !== 1 ? 'is' : ''}
            </p>
            <div className="mt-5 flex gap-3 justify-end">
              <button
                onClick={() => setConfirmRoom(null)}
                className="rounded-xl px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleCheckin(confirmRoom)}
                disabled={!!checkingIn}
                className="rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60 flex items-center gap-2"
              >
                {checkingIn && <Spinner size="sm" className="text-white" />}
                {checkingIn ? 'Entrando...' : 'Confirmar entrada'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
