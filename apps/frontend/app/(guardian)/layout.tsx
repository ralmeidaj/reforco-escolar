import AppShell from '@/app/components/AppShell';

export default function GuardianLayout({ children }: { children: React.ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
