import { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, SafeAreaView } from 'react-native';
import { api } from '../../../lib/api';
import { Card, Badge, SkeletonCard, EmptyState, colors } from '../../../components/ui';

interface Task { id: string; title: string; dueDate: string | null; type: string; done: boolean; }

const TYPE_ICONS: Record<string, string> = { padrao: '📌', trabalho: '📚', eureka: '💡', trilha: '🗺️' };

export default function GuardianTasks() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/tasks/student/me').then((r) => setTasks(r.data)).finally(() => setLoading(false));
  }, []);

  const pending = tasks.filter((t) => !t.done);
  const done    = tasks.filter((t) => t.done);
  const overdue = pending.filter((t) => t.dueDate && new Date(t.dueDate) < new Date());

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.headerBar}>
        <Text style={s.title}>Tarefas do aluno</Text>
        {overdue.length > 0 && (
          <View style={s.overdueBadge}><Text style={s.overdueText}>{overdue.length} atrasada(s)</Text></View>
        )}
      </View>
      <ScrollView contentContainerStyle={s.content}>
        {loading ? (
          [1, 2, 3].map((i) => <SkeletonCard key={i} />)
        ) : tasks.length === 0 ? (
          <EmptyState icon="📋" message="Nenhuma tarefa cadastrada" />
        ) : (
          <>
            {pending.length > 0 && (
              <>
                <Text style={s.section}>Pendentes ({pending.length})</Text>
                {pending.map((t) => {
                  const late = t.dueDate && new Date(t.dueDate) < new Date();
                  return (
                    <Card key={t.id} style={late ? s.lateCard : undefined}>
                      <View style={row.row}>
                        <Text style={s.icon}>{TYPE_ICONS[t.type] ?? '📌'}</Text>
                        <View style={{ flex: 1 }}>
                          <Text style={s.taskTitle}>{t.title}</Text>
                          {t.dueDate && (
                            <Text style={[s.due, late && s.lateText]}>
                              {late ? '⚠️ Prazo: ' : 'Prazo: '}{new Date(t.dueDate).toLocaleDateString('pt-BR')}
                            </Text>
                          )}
                        </View>
                        <Badge label="Pendente" variant="warning" />
                      </View>
                    </Card>
                  );
                })}
              </>
            )}
            {done.length > 0 && (
              <>
                <Text style={s.section}>Concluídas ({done.length})</Text>
                {done.map((t) => (
                  <Card key={t.id} style={{ opacity: 0.7 }}>
                    <View style={row.row}>
                      <Text style={s.icon}>{TYPE_ICONS[t.type] ?? '📌'}</Text>
                      <Text style={[s.taskTitle, s.done]}>{t.title}</Text>
                      <Badge label="Feita" variant="success" />
                    </View>
                  </Card>
                ))}
              </>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  headerBar: { backgroundColor: '#fff', padding: 16, borderBottomWidth: 1, borderColor: colors.border, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontSize: 20, fontWeight: '700', color: colors.text },
  overdueBadge: { backgroundColor: '#FEE2E2', borderRadius: 99, paddingHorizontal: 8, paddingVertical: 3 },
  overdueText: { fontSize: 12, color: colors.danger, fontWeight: '600' },
  content: { padding: 16, paddingBottom: 40 },
  section: { fontSize: 13, fontWeight: '700', color: colors.muted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8, marginTop: 4 },
  icon: { fontSize: 20, marginRight: 10 },
  taskTitle: { fontSize: 15, fontWeight: '600', color: colors.text },
  due: { fontSize: 12, color: colors.muted, marginTop: 2 },
  lateText: { color: colors.danger },
  lateCard: { borderLeftWidth: 3, borderLeftColor: colors.danger },
  done: { textDecorationLine: 'line-through', color: colors.muted },
});
const row = StyleSheet.create({ row: { flexDirection: 'row', alignItems: 'center' } });
