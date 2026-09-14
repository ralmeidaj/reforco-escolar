'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { LOGO_DATA_URI } from '@/app/lib/logo';

interface Assignment {
  id: string;
  teacher: { id: string; name: string };
  subject: { id: string; name: string } | null;
}

interface Room {
  id: string;
  name: string;
  capacity: number;
  currentOccupancy: number;
  available: number;
  isFull: boolean;
  assignments: Assignment[];
}

interface Student {
  id: string;
  name: string;
}

interface CheckedInStudent {
  studentId: string;
  studentName: string;
  roomName: string;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';

const KIOSK_SLUG_KEY = 'kiosk_tenant_slug';

function getTenantSlug(): string {
  if (typeof window === 'undefined') return '';
  // 1. query param: /kiosk?tenant=minha-escola
  const param = new URLSearchParams(window.location.search).get('tenant');
  if (param) { localStorage.setItem(KIOSK_SLUG_KEY, param); return param; }
  // 2. localStorage (digitado em sessão anterior)
  const stored = localStorage.getItem(KIOSK_SLUG_KEY);
  if (stored) return stored;
  // 3. subdomínio: escola.app.com → 'escola'
  const parts = window.location.hostname.split('.');
  return parts.length >= 3 ? parts[0] : '';
}

async function kioskFetch<T>(path: string, opts?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      'X-Tenant-Slug': getTenantSlug(),
      ...(opts?.headers ?? {}),
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message ?? 'Erro');
  }
  return res.json();
}

function OccupancyBar({ pct, isFull }: { pct: number; isFull: boolean }) {
  const color = isFull ? 'bg-red-500' : pct >= 75 ? 'bg-amber-400' : 'bg-emerald-400';
  return (
    <div className="h-3 w-full overflow-hidden rounded-full bg-white/10">
      <div className={`h-3 rounded-full transition-all duration-700 ${color}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

type Step = 'setup' | 'rooms' | 'search' | 'confirm' | 'success' | 'error' | 'exit-search';

export default function KioskPage() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  // Começa sempre em 'setup' (mesmo valor no server e no 1º render do client,
  // já que getTenantSlug() depende de window) para não causar hydration mismatch;
  // o efeito abaixo decide a tela certa assim que roda no navegador.
  const [step, setStep] = useState<Step>('setup');
  const [tenantInput, setTenantInput] = useState('');
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [query, setQuery] = useState('');
  const [students, setStudents] = useState<Student[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [checkingIn, setCheckingIn] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successName, setSuccessName] = useState('');
  const [successKind, setSuccessKind] = useState<'checkin' | 'checkout'>('checkin');
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const [exitQuery, setExitQuery] = useState('');
  const [exitResults, setExitResults] = useState<CheckedInStudent[]>([]);
  const [exitSearching, setExitSearching] = useState(false);
  const [selectedExit, setSelectedExit] = useState<CheckedInStudent | null>(null);
  const [checkingOut, setCheckingOut] = useState(false);
  const exitDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const exitInputRef = useRef<HTMLInputElement>(null);

  const loadRooms = useCallback(async () => {
    if (!getTenantSlug()) return;
    try {
      const data = await kioskFetch<Room[]>('/kiosk/rooms');
      setRooms(data);
    } catch {}
  }, []);

  useEffect(() => {
    if (getTenantSlug()) setStep('rooms');
  }, []);

  useEffect(() => {
    loadRooms().finally(() => setLoading(false));
    intervalRef.current = setInterval(loadRooms, 30_000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [loadRooms]);

  // auto-dismiss success/error after 4s
  useEffect(() => {
    if (step !== 'success' && step !== 'error') return;
    const t = setTimeout(() => { setStep('rooms'); loadRooms(); }, 4000);
    return () => clearTimeout(t);
  }, [step, loadRooms]);

  // focus input when search modal opens
  useEffect(() => {
    if (step === 'search') {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
    if (step === 'exit-search') {
      setTimeout(() => exitInputRef.current?.focus(), 100);
    }
  }, [step]);

  function openSearch(room: Room) {
    setSelectedRoom(room);
    setQuery('');
    setStudents([]);
    setSelectedStudent(null);
    setStep('search');
  }

  function openExitSearch() {
    setExitQuery('');
    setExitResults([]);
    setSelectedExit(null);
    setStep('exit-search');
  }

  function handleExitQueryChange(val: string) {
    setExitQuery(val);
    setSelectedExit(null);
    if (exitDebounceRef.current) clearTimeout(exitDebounceRef.current);
    if (val.length < 2) { setExitResults([]); return; }
    exitDebounceRef.current = setTimeout(async () => {
      setExitSearching(true);
      try {
        const data = await kioskFetch<CheckedInStudent[]>(`/kiosk/checked-in?q=${encodeURIComponent(val)}`);
        setExitResults(data);
      } catch {}
      setExitSearching(false);
    }, 350);
  }

  async function handleCheckout() {
    if (!selectedExit) return;
    setCheckingOut(true);
    try {
      await kioskFetch('/kiosk/checkout', {
        method: 'POST',
        body: JSON.stringify({ studentId: selectedExit.studentId }),
      });
      setSuccessName(selectedExit.studentName.split(' ')[0]);
      setSuccessKind('checkout');
      setStep('success');
    } catch (e: any) {
      setErrorMsg(e.message ?? 'Não foi possível registrar a saída');
      setStep('error');
    }
    setCheckingOut(false);
  }

  function handleQueryChange(val: string) {
    setQuery(val);
    setSelectedStudent(null);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (val.length < 2) { setStudents([]); return; }
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const data = await kioskFetch<Student[]>(`/kiosk/students?q=${encodeURIComponent(val)}`);
        setStudents(data);
      } catch {}
      setSearching(false);
    }, 350);
  }

  async function handleCheckin() {
    if (!selectedStudent || !selectedRoom) return;
    setCheckingIn(true);
    try {
      await kioskFetch('/kiosk/checkin', {
        method: 'POST',
        body: JSON.stringify({ studentId: selectedStudent.id, roomId: selectedRoom.id }),
      });
      setSuccessName(selectedStudent.name.split(' ')[0]);
      setSuccessKind('checkin');
      setStep('success');
    } catch (e: any) {
      setErrorMsg(e.message ?? 'Não foi possível registrar a entrada');
      setStep('error');
    }
    setCheckingIn(false);
  }

  function cancel() {
    setStep('rooms');
    setQuery('');
    setStudents([]);
    setSelectedStudent(null);
    setExitQuery('');
    setExitResults([]);
    setSelectedExit(null);
  }

  const pct = (r: Room) => r.capacity ? Math.min(100, Math.round((r.currentOccupancy / r.capacity) * 100)) : 0;

  if (step === 'setup') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#123B2C] via-[#1E7A4C] to-[#6FA83C] text-white flex items-center justify-center p-6">
        <div className="w-full max-w-sm text-center">
          <img src={LOGO_DATA_URI} alt="Clube de Estudos" className="h-16 w-auto object-contain mx-auto mb-6" />
          <h1 className="text-3xl font-black mb-2">Kiosk</h1>
          <p className="text-white/80 mb-8 text-sm">Digite o identificador da sua escola para continuar</p>
          <form onSubmit={(e) => {
            e.preventDefault();
            const slug = tenantInput.trim();
            if (!slug) return;
            localStorage.setItem(KIOSK_SLUG_KEY, slug);
            const url = new URL(window.location.href);
            url.searchParams.set('tenant', slug);
            window.location.href = url.toString();
          }} className="space-y-4">
            <input
              autoFocus
              type="text"
              value={tenantInput}
              onChange={(e) => setTenantInput(e.target.value)}
              placeholder="Ex: escola-silva"
              className="w-full rounded-2xl bg-white/10 border border-white/20 px-5 py-4 text-white text-lg placeholder-white/30 outline-none focus:border-brand-200"
            />
            <button
              type="submit"
              disabled={!tenantInput.trim()}
              className="w-full rounded-2xl bg-brand-600 py-4 text-base font-bold hover:bg-brand-500 disabled:opacity-40"
            >
              Entrar
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#123B2C] via-[#1E7A4C] to-[#6FA83C] text-white">
      {/* Header */}
      <header className="flex items-center justify-between px-8 py-5 border-b border-white/10">
        <div className="flex items-center gap-6">
          <img src={LOGO_DATA_URI} alt="Clube de Estudos" className="h-10 w-auto object-contain" />
          <div className="w-px h-8 bg-white/20" />
          <div>
            <h1 className="text-3xl font-black tracking-tight">Escolha sua sala</h1>
            <p className="mt-0.5 text-white/80 text-sm">Toque em uma sala para registrar sua chegada</p>
          </div>
        </div>
        <div className="flex items-center gap-6">
          <button
            onClick={openExitSearch}
            className="rounded-2xl border border-white/20 bg-white/10 px-5 py-3 text-sm font-semibold hover:bg-white/20"
          >
            Sair do reforço
          </button>
          <div className="text-right text-sm text-white/80">
            <Clock />
          </div>
        </div>
      </header>

      {/* Rooms grid */}
      <main className="p-8">
        {loading ? (
          <div className="grid grid-cols-2 gap-6 lg:grid-cols-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-48 animate-pulse rounded-3xl bg-white/10" />
            ))}
          </div>
        ) : rooms.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 text-white/80">
            <span className="text-6xl">🏫</span>
            <p className="mt-4 text-xl">Nenhuma sala disponível agora</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-6 lg:grid-cols-3">
            {rooms.map((room) => (
              <button
                key={room.id}
                onClick={() => !room.isFull && openSearch(room)}
                disabled={room.isFull}
                className={`group relative flex flex-col rounded-3xl p-7 text-left transition-all duration-200
                  ${room.isFull
                    ? 'bg-white/5 cursor-not-allowed opacity-60'
                    : 'bg-white/10 hover:bg-white/20 hover:scale-[1.02] active:scale-[0.99] cursor-pointer shadow-lg'
                  }`}
              >
                {room.isFull && (
                  <span className="absolute top-4 right-4 rounded-full bg-red-500/80 px-3 py-1 text-xs font-bold">LOTADA</span>
                )}
                <h2 className="text-2xl font-bold">{room.name}</h2>
                {room.assignments?.length > 0 && (
                  <p className="mt-1 text-sm text-white/80">
                    {room.assignments.map((a) =>
                      [a.subject?.name, `Prof. ${a.teacher.name}`].filter(Boolean).join(' · ')
                    ).join(' | ')}
                  </p>
                )}
                <div className="mt-2 flex items-baseline gap-1">
                  <span className={`text-5xl font-black ${room.isFull ? 'text-red-400' : 'text-white'}`}>
                    {room.available}
                  </span>
                  <span className="text-white/80 text-lg">/ {room.capacity}</span>
                </div>
                <p className="mt-0.5 text-sm text-white/80">
                  {room.isFull ? 'sem vagas' : `vaga${room.available !== 1 ? 's' : ''} disponível${room.available !== 1 ? 'is' : ''}`}
                </p>
                <div className="mt-4">
                  <OccupancyBar pct={pct(room)} isFull={room.isFull} />
                </div>
                {!room.isFull && (
                  <div className="mt-4 flex items-center gap-2 text-sm font-semibold text-white/80 group-hover:text-white transition-colors">
                    <span>Entrar nessa sala</span>
                    <span>→</span>
                  </div>
                )}
              </button>
            ))}
          </div>
        )}
      </main>

      {/* Modal: busca de aluno */}
      {step === 'search' && selectedRoom && (
        <Modal>
          <div className="text-center mb-6">
            <p className="text-white/70 text-sm font-medium">Entrando em</p>
            <h2 className="text-2xl font-black mt-0.5">{selectedRoom.name}</h2>
          </div>

          <label className="block text-sm font-semibold text-white/80 mb-2">Digite seu nome</label>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => handleQueryChange(e.target.value)}
            placeholder="Ex: João Silva"
            className="w-full rounded-2xl bg-white/10 border border-white/20 px-5 py-4 text-white text-lg placeholder-white/30 outline-none focus:border-brand-200 focus:bg-white/15"
          />

          <div className="mt-3 min-h-[120px]">
            {searching && (
              <p className="text-center text-white/70 text-sm mt-6">Buscando...</p>
            )}
            {!searching && query.length >= 2 && students.length === 0 && (
              <p className="text-center text-white/70 text-sm mt-6">Nenhum aluno encontrado</p>
            )}
            {students.length > 0 && (
              <ul className="space-y-2 mt-2">
                {students.map((st) => (
                  <li key={st.id}>
                    <button
                      onClick={() => setSelectedStudent(st)}
                      className={`w-full rounded-xl px-5 py-3 text-left text-lg font-medium transition-all
                        ${selectedStudent?.id === st.id
                          ? 'bg-brand-600 text-white'
                          : 'bg-white/10 text-white hover:bg-white/20'
                        }`}
                    >
                      {st.name}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="mt-6 flex gap-3">
            <button onClick={cancel} className="flex-1 rounded-2xl bg-white/10 py-4 text-base font-semibold hover:bg-white/20">
              Cancelar
            </button>
            <button
              onClick={handleCheckin}
              disabled={!selectedStudent || checkingIn}
              className="flex-1 rounded-2xl bg-brand-600 py-4 text-base font-bold hover:bg-brand-500 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {checkingIn ? 'Registrando...' : 'Confirmar entrada'}
            </button>
          </div>
        </Modal>
      )}

      {/* Modal: busca de aluno para saída */}
      {step === 'exit-search' && (
        <Modal>
          <div className="text-center mb-6">
            <p className="text-white/70 text-sm font-medium">Registrar saída</p>
            <h2 className="text-2xl font-black mt-0.5">Sair do reforço</h2>
          </div>

          <label className="block text-sm font-semibold text-white/80 mb-2">Digite seu nome</label>
          <input
            ref={exitInputRef}
            type="text"
            value={exitQuery}
            onChange={(e) => handleExitQueryChange(e.target.value)}
            placeholder="Ex: João Silva"
            className="w-full rounded-2xl bg-white/10 border border-white/20 px-5 py-4 text-white text-lg placeholder-white/30 outline-none focus:border-brand-200 focus:bg-white/15"
          />

          <div className="mt-3 min-h-[120px]">
            {exitSearching && (
              <p className="text-center text-white/70 text-sm mt-6">Buscando...</p>
            )}
            {!exitSearching && exitQuery.length >= 2 && exitResults.length === 0 && (
              <p className="text-center text-white/70 text-sm mt-6">Nenhum aluno com entrada registrada encontrado</p>
            )}
            {exitResults.length > 0 && (
              <ul className="space-y-2 mt-2">
                {exitResults.map((st) => (
                  <li key={st.studentId}>
                    <button
                      onClick={() => setSelectedExit(st)}
                      className={`w-full rounded-xl px-5 py-3 text-left transition-all
                        ${selectedExit?.studentId === st.studentId
                          ? 'bg-brand-600 text-white'
                          : 'bg-white/10 text-white hover:bg-white/20'
                        }`}
                    >
                      <span className="block text-lg font-medium">{st.studentName}</span>
                      <span className="block text-sm text-white/80">{st.roomName}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="mt-6 flex gap-3">
            <button onClick={cancel} className="flex-1 rounded-2xl bg-white/10 py-4 text-base font-semibold hover:bg-white/20">
              Cancelar
            </button>
            <button
              onClick={handleCheckout}
              disabled={!selectedExit || checkingOut}
              className="flex-1 rounded-2xl bg-brand-600 py-4 text-base font-bold hover:bg-brand-500 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {checkingOut ? 'Registrando...' : 'Confirmar saída'}
            </button>
          </div>
        </Modal>
      )}

      {/* Sucesso */}
      {step === 'success' && (
        <Modal center>
          <div className="text-center py-4">
            <div className="text-7xl mb-4">{successKind === 'checkout' ? '👋' : '✅'}</div>
            <h2 className="text-3xl font-black">
              {successKind === 'checkout' ? `Até logo, ${successName}!` : `Bem-vindo, ${successName}!`}
            </h2>
            <p className="mt-2 text-white/80">
              {successKind === 'checkout'
                ? <>Saída registrada{selectedExit ? <> de <strong>{selectedExit.roomName}</strong></> : null}</>
                : <>Entrada registrada em <strong>{selectedRoom?.name}</strong></>}
            </p>
            <p className="mt-4 text-sm text-white/70">Fechando em alguns segundos...</p>
          </div>
        </Modal>
      )}

      {/* Erro */}
      {step === 'error' && (
        <Modal center>
          <div className="text-center py-4">
            <div className="text-7xl mb-4">⚠️</div>
            <h2 className="text-2xl font-black">Ops!</h2>
            <p className="mt-2 text-white/80">{errorMsg}</p>
            <button onClick={() => setStep('rooms')} className="mt-6 rounded-2xl bg-white/10 px-8 py-3 font-semibold hover:bg-white/20">
              Fechar
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function Modal({ children, center }: { children: React.ReactNode; center?: boolean }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-6">
      <div className={`w-full max-w-md rounded-3xl bg-[#123B2C] border border-white/10 shadow-2xl p-8 ${center ? 'text-center' : ''}`}>
        {children}
      </div>
    </div>
  );
}

function getShiftLabel(h: number): { label: string; range: string } {
  if (h < 12) return { label: 'Manhã', range: '06h – 12h' };
  if (h < 18) return { label: 'Tarde', range: '12h – 18h' };
  return { label: 'Noite', range: '18h – 24h' };
}

function Clock() {
  const [time, setTime] = useState('');
  const [shift, setShift] = useState<{ label: string; range: string } | null>(null);
  useEffect(() => {
    const update = () => {
      const now = new Date();
      setTime(now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }));
      setShift(getShiftLabel(now.getHours()));
    };
    update();
    const t = setInterval(update, 10_000);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="text-right">
      <div className="text-3xl font-black">{time}</div>
      {shift && (
        <div className="mt-0.5 text-sm font-semibold text-white/80">
          Turno da {shift.label} · {shift.range}
        </div>
      )}
    </div>
  );
}
