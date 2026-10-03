'use client';

import { useState, useEffect } from 'react';
import { api } from '@/app/lib/api';

interface Assignment {
  id: string;
  teacher: { id: string; name: string };
  subject: { id: string; name: string } | null;
}

interface Room {
  id: string;
  name: string;
  capacity: number;
  currentOccupancy?: number;
  assignments: Assignment[];
}

export default function TeacherRoomsPage() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get<Room[]>('/rooms/mine'),
      api.get<Room[]>('/rooms/occupancy'),
    ])
      .then(([mine, occupancy]) => {
        const occupancyMap = new Map(occupancy.data.map((r) => [r.id, r.currentOccupancy]));
        setRooms(mine.data.map((r) => ({ ...r, currentOccupancy: occupancyMap.get(r.id) ?? 0 })));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Minha Sala</h1>
        <p className="mt-1 text-sm text-gray-500">Salas em que você está alocado</p>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2].map((i) => <div key={i} className="h-24 animate-pulse rounded-2xl bg-gray-100" />)}
        </div>
      ) : rooms.length === 0 ? (
        <div className="rounded-2xl bg-white p-8 text-center shadow-sm">
          <p className="text-sm text-gray-400">Você ainda não está alocado em nenhuma sala. Fale com a coordenação.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {rooms.map((room) => {
            const occ = room.currentOccupancy ?? 0;
            const mySubjects = room.assignments.filter((a) => a.subject).map((a) => a.subject!.name);
            return (
              <div key={room.id} className="rounded-2xl bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-base font-semibold text-gray-900">{room.name}</p>
                    {mySubjects.length > 0 && (
                      <p className="mt-0.5 text-xs text-gray-500">{mySubjects.join(', ')}</p>
                    )}
                  </div>
                  <span className="rounded-full bg-brand-100 px-3 py-1 text-xs font-semibold text-brand-700">
                    {occ} / {room.capacity}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
