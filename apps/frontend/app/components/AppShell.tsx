'use client';

import { LOGO_DATA_URI } from '@/app/lib/logo';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useEffect, useMemo } from 'react';
import { cn } from '@/app/lib/utils';
import { api } from '@/app/lib/api';
import { Spinner } from '@/app/components/Spinner';
import { NotificationBell } from '@/app/components/NotificationBell';
import {
  LayoutDashboard, Users, BookOpen, GraduationCap, ClipboardList,
  Calendar, DoorOpen, Monitor, CheckSquare, Wallet, BarChart2, Settings,
  FileText, MessageCircle, TrendingUp, Brain, UserPlus,
} from 'lucide-react';

interface Me { name: string; email: string; role: string }
type LucideIcon = React.ComponentType<{ className?: string }>;
interface NavItem { href?: string; label: string; external?: boolean; section?: boolean; icon?: LucideIcon }

const adminNav: NavItem[] = [
  { href: '/admin',              label: 'Dashboard',     icon: LayoutDashboard },
  { section: true,               label: 'Cadastros' },
  { href: '/admin/users',        label: 'Usuários',      icon: Users },
  { href: '/admin/subjects',     label: 'Disciplinas',   icon: BookOpen },
  { href: '/admin/groups',       label: 'Turmas',        icon: GraduationCap },
  { href: '/admin/enrollments',  label: 'Matrículas',    icon: UserPlus },
  { section: true,               label: 'Operacional' },
  { href: '/admin/schedule',     label: 'Agendamento',   icon: Calendar },
  { href: '/admin/rooms',        label: 'Salas',         icon: DoorOpen },
  { href: '/kiosk',              label: 'Kiosk',         icon: Monitor, external: true },
  { href: '/admin/attendance',   label: 'Presenças',     icon: CheckSquare },
  { href: '/admin/finance',      label: 'Financeiro',    icon: Wallet },
  { href: '/admin/reports',      label: 'Relatórios',    icon: BarChart2 },
  { href: '/admin/settings',     label: 'Configurações', icon: Settings },
];

const teacherNav: NavItem[] = [
  { href: '/teacher',              label: 'Dashboard',     icon: LayoutDashboard },
  { href: '/teacher/attendance',   label: 'Presença',      icon: CheckSquare },
  { href: '/teacher/tasks',        label: 'Tarefas',       icon: ClipboardList },
  { href: '/teacher/notes',        label: 'Notas de aula', icon: FileText },
  { href: '/teacher/students',     label: 'Alunos',        icon: Users },
  { href: '/teacher/chat',         label: 'Chat',          icon: MessageCircle },
  { href: '/teacher/ai',           label: 'IA Pedagógica', icon: Brain },
];

const studentNav: NavItem[] = [
  { href: '/student',            label: 'Dashboard',        icon: LayoutDashboard },
  { href: '/student/rooms',      label: 'Salas',            icon: DoorOpen },
  { href: '/student/tasks',      label: 'Tarefas',          icon: ClipboardList },
  { href: '/student/study-log',  label: 'Diário de estudo', icon: BookOpen },
  { href: '/student/activity',   label: 'Atividades',       icon: FileText },
  { href: '/student/progress',   label: 'Evolução',         icon: TrendingUp },
  { href: '/student/ai',         label: 'Meu Panorama',     icon: Brain },
];

const guardianNav: NavItem[] = [
  { href: '/guardian',             label: 'Dashboard',  icon: LayoutDashboard },
  { href: '/guardian/attendance',  label: 'Frequência', icon: CheckSquare },
  { href: '/guardian/tasks',       label: 'Tarefas',    icon: ClipboardList },
  { href: '/guardian/progress',    label: 'Evolução',   icon: TrendingUp },
  { href: '/guardian/finance',     label: 'Financeiro', icon: Wallet },
  { href: '/guardian/chat',        label: 'Chat',       icon: MessageCircle },
  { href: '/guardian/ai',          label: 'Panorama',   icon: Brain },
];

const navByRole: Record<string, NavItem[]> = {
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
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());

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

  const role = me?.role ?? 'student';
  const navItems = navByRole[role] ?? studentNav;
  const badge = roleBadge[role];

  // useMemo deve ficar antes de qualquer return condicional (Rules of Hooks)
  type NavGroup = { section?: string; items: NavItem[] };
  const navGroups = useMemo<NavGroup[]>(() => {
    const groups: NavGroup[] = [];
    for (const item of navItems) {
      if (item.section) {
        groups.push({ section: item.label, items: [] });
      } else {
        if (groups.length === 0) groups.push({ items: [] });
        groups[groups.length - 1].items.push(item);
      }
    }
    return groups;
  }, [navItems]);

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

  function toggleSection(label: string) {
    setCollapsedSections((prev) => {
      const next = new Set(prev);
      if (next.has(label)) next.delete(label); else next.add(label);
      return next;
    });
  }

  if (!meLoaded) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-200 border-t-brand-600" />
      </div>
    );
  }

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

        {/* Logo */}
        <div className="relative flex justify-center px-4 py-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={LOGO_DATA_URI} alt="ReforçoPro" className="h-14 w-auto" />
          <button onClick={() => setSidebarOpen(false)} className="absolute right-2 top-2 rounded-lg p-1 text-white/60 hover:bg-white/10 lg:hidden">
            <CloseIcon />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-3 py-2 space-y-0.5 [&::-webkit-scrollbar]:hidden [scrollbar-width:none]">
          {navGroups.map((group, gIdx) => {
            const isCollapsed = group.section ? collapsedSections.has(group.section) : false;
            return (
              <div key={gIdx}>
                {/* Cabeçalho de seção colapsável */}
                {group.section && (
                  <button
                    onClick={() => toggleSection(group.section!)}
                    className="flex w-full items-center justify-between px-3 py-1.5 mt-3 first:mt-0"
                  >
                    <span className="text-[10px] font-bold uppercase tracking-widest text-white/40">
                      {group.section}
                    </span>
                    <svg
                      className={cn('h-3 w-3 text-white/30 transition-transform duration-200', isCollapsed && '-rotate-90')}
                      fill="none" stroke="currentColor" viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                )}
                {/* Itens do grupo */}
                {!isCollapsed && group.items.map((item) => {
                  const href = item.href!;
                  const isRootItem = !href.includes('/', 1);
                  const isActive = !item.external && (pathname === href ||
                    (!isRootItem && pathname.startsWith(`${href}/`)));
                  const Icon = item.icon;
                  if (item.external) {
                    return (
                      <a
                        key={href}
                        href={href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={cn(
                          'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-white/70 hover:bg-white/10 hover:text-white transition-all duration-150',
                          group.section && 'pl-5',
                        )}
                      >
                        {Icon && <Icon className="h-4 w-4 shrink-0" />}
                        {item.label}
                        <svg className="ml-auto h-3 w-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                      </a>
                    );
                  }
                  return (
                    <button
                      key={href}
                      onClick={() => navigate(href)}
                      className={cn(
                        'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-150',
                        group.section && 'pl-5',
                        isActive
                          ? 'bg-white/20 text-white shadow-sm backdrop-blur-sm'
                          : 'text-white/70 hover:bg-white/10 hover:text-white',
                      )}
                    >
                      {Icon && <Icon className="h-4 w-4 shrink-0" />}
                      {item.label}
                      {isActive && <div className="ml-auto h-1.5 w-1.5 rounded-full bg-white" />}
                    </button>
                  );
                })}
              </div>
            );
          })}
        </nav>
      </aside>

      {/* Content */}
      <div className="flex min-w-0 flex-1 flex-col lg:ml-64">
        {/* Top bar */}
        <header className="sticky top-0 z-40 flex h-14 items-center gap-3 bg-white px-4 shadow-sm">
          <button
            onClick={() => setSidebarOpen(true)}
            className="rounded-lg p-2 text-gray-600 hover:bg-gray-100 lg:hidden"
            aria-label="Abrir menu"
          >
            <MenuIcon />
          </button>
          <span className="text-sm font-bold text-brand-600 lg:hidden">ReforçoPro</span>

          <div className="ml-auto flex items-center gap-3">
            <NotificationBell />

            {/* Perfil */}
            <div className="flex items-center gap-2 border-l border-gray-100 pl-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-100 text-sm font-bold text-brand-700">
                {me ? initials(me.name) : '?'}
              </div>
              <div className="hidden min-w-0 sm:block">
                <p className="max-w-[320px] truncate text-sm font-semibold leading-tight text-gray-900">{me?.name ?? 'Usuário'}</p>
                {badge && (
                  <span className="mt-0.5 inline-block rounded-full bg-brand-100 px-2 py-0.5 text-[11px] font-medium text-brand-700">
                    {badge.label}
                  </span>
                )}
              </div>
              <button
                onClick={logout}
                disabled={loggingOut}
                title="Sair"
                className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 disabled:opacity-60"
              >
                {loggingOut ? <Spinner size="sm" className="text-gray-400" /> : <LogoutIcon />}
              </button>
            </div>
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
