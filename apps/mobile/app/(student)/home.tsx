import { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, SafeAreaView } from 'react-native';
import { api } from '../../lib/api';
import { getUser } from '../../lib/auth';
import { Card, Badge, SkeletonCard, EmptyState, colors } from '../../components/ui';

interface Session {
  id: string;
  scheduledAt: string;
  subject?: { name: string };
  teacher?: { name: string };
  status: string;
}

interface Task {
  id: string;
  title: string;
  dueDate: string | null;
  type: string;
  done: boolean;
}

const STATUS_VARIANT: Record<string, string> = {
  agendada: 'primary', confirmada: 'success', realizada: 'muted', cancelada: 'danger',
};

export default function StudentHome() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [userName, setUserName] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const user = await getUser<{ name: string }>();
      setUserName(user?.name?.split(' ')[0] ?? '');
      try {
        const [sessRes, taskRes] = await Promise.all([
          api.get('/sessions?limit=5'),
          api.get('/tasks?status=pending&limit=5'),
        ]);
        setSessions(sessRes.data);
        setTasks(taskRes.data);
      } catch {}
      setLoading(false);
    })();
  }, []);

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView style={s.scroll} contentContainerStyle={s.content}>
        <Text style={s.greeting}>Olá, {userName} 👋</Text>
        <Text style={s.subGreeting}>Veja o que tem para hoje</Text>

        <Text style={s.section}>Próximas aulas</Text>
        {loading
          ? [1, 2].map((i) => <SkeletonCard key={i} height={80} />)
          : sessions.length === 0
            ? <EmptyState icon="📅" message="Nenhuma aula agendada" />
            : sessions.map((s) => (
                <Card key={s.id}>
                  <View style={row.row}>
                    <View style={{ flex: 1 }}>
                      <Text style={s2.title}>{s.subject?.name ?? 'Aula'}</Text>
                      <Text style={s2.sub}>Prof. {s.teacher?.name ?? '—'}</Text>
                      <Text style={s2.sub}>{new Date(s.scheduledAt).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}</Text>
                    </View>
                    <Badge label={s.status} variant={STATUS_VARIANT[s.status] ?? 'muted'} />
                  </View>
                </Card>
              ))
        }

        <Text style={s.section}>Tarefas pendentes</Text>
        {loading
          ? [1, 2].map((i) => <SkeletonCard key={i} height={64} />)
          : tasks.length === 0
            ? <EmptyState icon="✅" message="Nenhuma tarefa pendente" />
            : tasks.map((t) => (
                <Card key={t.id}>
                  <Text style={s2.title}>{t.title}</Text>
                  {t.dueDate && (
                    <Text style={[s2.sub, { marginTop: 2 }]}>
                      Prazo: {new Date(t.dueDate).toLocaleDateString('pt-BR')}
                    </Text>
                  )}
                </Card>
              ))
        }
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  scroll: { flex: 1 },
  content: { padding: 20, paddingBottom: 40 },
  greeting: { fontSize: 24, fontWeight: '700', color: colors.text },
  subGreeting: { fontSize: 14, color: colors.muted, marginBottom: 20 },
  section: { fontSize: 13, fontWeight: '700', color: colors.muted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8, marginTop: 4 },
});
const s2 = StyleSheet.create({
  title: { fontSize: 15, fontWeight: '600', color: colors.text },
  sub: { fontSize: 13, color: colors.muted, marginTop: 2 },
});
const row = StyleSheet.create({ row: { flexDirection: 'row', alignItems: 'center', gap: 8 } });
