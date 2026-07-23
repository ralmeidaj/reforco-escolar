'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { cn } from '@/app/lib/utils';
import { api } from '@/app/lib/api';
import { Spinner } from '@/app/components/Spinner';
import { NotificationBell } from '@/app/components/NotificationBell';

interface Me { name: string; email: string; role: string }

const adminNav = [
  { href: '/admin',              label: 'Dashboard' },
  { href: '/admin/users',        label: 'Usuários' },
  { href: '/admin/subjects',     label: 'Disciplinas' },
  { href: '/admin/groups',       label: 'Turmas' },
  { href: '/admin/schedule',     label: 'Agendamento' },
  { href: '/admin/rooms',        label: 'Salas' },
  { href: '/admin/attendance',   label: 'Presenças' },
  { href: '/admin/finance',      label: 'Financeiro' },
  { href: '/admin/reports',      label: 'Relatórios' },
  { href: '/admin/settings',     label: 'Configurações' },
];

const teacherNav = [
  { href: '/teacher',              label: 'Dashboard' },
  { href: '/teacher/attendance',   label: 'Presença' },
  { href: '/teacher/tasks',        label: 'Tarefas' },
  { href: '/teacher/notes',        label: 'Notas de aula' },
  { href: '/teacher/students',     label: 'Alunos' },
  { href: '/teacher/chat',         label: 'Chat' },
  { href: '/teacher/ai',           label: 'IA Pedagógica' },
];

const studentNav = [
  { href: '/student',            label: 'Dashboard' },
  { href: '/student/tasks',      label: 'Tarefas' },
  { href: '/student/study-log',  label: 'Diário de estudo' },
  { href: '/student/activity',   label: 'Atividades' },
  { href: '/student/progress',   label: 'Evolução' },
  { href: '/student/ai',         label: 'Meu Panorama' },
];

const guardianNav = [
  { href: '/guardian',             label: 'Dashboard' },
  { href: '/guardian/attendance',  label: 'Frequência' },
  { href: '/guardian/tasks',       label: 'Tarefas' },
  { href: '/guardian/progress',    label: 'Evolução' },
  { href: '/guardian/finance',     label: 'Financeiro' },
  { href: '/guardian/chat',        label: 'Chat' },
  { href: '/guardian/ai',          label: 'Panorama' },
];

const navByRole: Record<string, { href: string; label: string }[]> = {
  tenant_admin: adminNav,
  teacher: teacherNav,
  student: studentNav,
  guardian: guardianNav,
};

const roleBadge: Record<string, { label: string; className: string }> = {
  tenant_admin: { label: 'Admin',        className: 'bg-red-500/20 text-red-200' },
  teacher:      { label: 'Professor',    className: 'bg-white/20 text-white' },
  student:      { label: 'Aluno',        className: 'bg-white/20 text-white' },
  guardian:     { label: 'Responsável',  className: 'bg-white/20 text-white' },
};

function initials(name: string) {
  return name.split(' ').slice(0, 2).map((n) => n[0]).join('').toUpperCase();
}

function MenuIcon()  { return <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16"/></svg>; }
function CloseIcon() { return <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>; }
function LogoutIcon() { return <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/></svg>; }

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [me, setMe] = useState<Me | null>(null);
  const [meLoaded, setMeLoaded] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [navigatingTo, setNavigatingTo] = useState<string | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    api.get<Me>('/auth/me')
      .then(({ data }) => setMe(data))
      .catch(() => {})
      .finally(() => setMeLoaded(true));
  }, []);

  useEffect(() => {
    setSidebarOpen(false);
    setNavigatingTo(null);
  }, [pathname]);

  function navigate(href: string) {
    if (pathname === href) return;
    setNavigatingTo(href);
    router.push(href);
  }

  async function logout() {
    setLoggingOut(true);
    try { await api.post('/auth/logout'); } catch {}
    router.push('/login');
  }

  if (!meLoaded) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-200 border-t-brand-600" />
      </div>
    );
  }

  const role = me?.role ?? 'student';
  const navItems = navByRole[role] ?? studentNav;
  const badge = roleBadge[role];

  return (
    <div className="flex min-h-screen bg-slate-100">
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={cn(
        'fixed inset-y-0 left-0 z-50 flex w-64 flex-col transition-transform duration-200 ease-in-out',
        'bg-gradient-to-b from-blue-600 via-blue-500 to-sky-400',
        sidebarOpen ? 'translate-x-0' : '-translate-x-full',
        'lg:translate-x-0',
      )}>
        <div className="pointer-events-none absolute inset-x-0 top-0 h-32 rounded-bl-full bg-white/5" />

        {/* Logo + badge */}
        <div className="flex h-16 items-center justify-between px-5">
          <div className="flex items-center gap-2">
            <span className="text-base font-bold text-white">Reforços</span>
            {badge && (
              <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', badge.className)}>
                {badge.label}
              </span>
            )}
          </div>
          <button onClick={() => setSidebarOpen(false)} className="rounded-lg p-1 text-white/60 hover:bg-white/10 lg:hidden">
            <CloseIcon />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-2">
          {navItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <button
                key={item.href}
                onClick={() => navigate(item.href)}
                className={cn(
                  'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-150',
                  isActive
                    ? 'bg-white/20 text-white shadow-sm backdrop-blur-sm'
                    : 'text-white/70 hover:bg-white/10 hover:text-white',
                )}
              >
                {item.label}
                {isActive && <div className="ml-auto h-1.5 w-1.5 rounded-full bg-white" />}
              </button>
            );
          })}
        </nav>

        {/* User info */}
        <div className="p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/20 text-sm font-semibold text-white">
              {me ? initials(me.name) : '?'}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-white">{me?.name ?? 'Usuário'}</p>
              <p className="truncate text-xs text-white/60">{me?.email ?? ''}</p>
            </div>
            <button
              onClick={logout}
              disabled={loggingOut}
              title="Sair"
              className="shrink-0 rounded-lg p-1.5 text-white hover:bg-white/20 disabled:opacity-60"
            >
              {loggingOut ? <Spinner size="sm" className="text-white" /> : <LogoutIcon />}
            </button>
          </div>
        </div>
      </aside>

      {/* Content */}
      <div className="flex min-w-0 flex-1 flex-col lg:ml-64">
        {/* Top bar */}
        <header className="sticky top-0 z-40 flex h-14 items-center bg-white px-4 shadow-sm">
          <button
            onClick={() => setSidebarOpen(true)}
            className="mr-3 rounded-lg p-2 text-gray-600 hover:bg-gray-100 lg:hidden"
            aria-label="Abrir menu"
          >
            <MenuIcon />
          </button>
          <span className="flex-1 text-sm font-bold text-brand-600 lg:hidden">Reforços Escolares</span>
          <div className="ml-auto">
            <NotificationBell />
          </div>
        </header>

        <main className="relative flex-1 p-4 lg:p-6">
          {navigatingTo && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/60 backdrop-blur-sm">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-200 border-t-brand-600" />
            </div>
          )}
          {children}
        </main>
      </div>
    </div>
  );
}
