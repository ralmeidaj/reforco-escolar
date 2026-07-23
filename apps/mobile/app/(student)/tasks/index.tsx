import { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, SafeAreaView } from 'react-native';
import { api } from '../../../lib/api';
import { Card, Badge, SkeletonCard, EmptyState, colors } from '../../../components/ui';

interface Task {
  id: string;
  title: string;
  description: string | null;
  dueDate: string | null;
  type: string;
  done: boolean;
}

const TYPE_ICONS: Record<string, string> = {
  padrao: '📌', trabalho: '📚', eureka: '💡', trilha: '🗺️',
};

export default function StudentTasks() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [marking, setMarking] = useState<string | null>(null);
  const [filter, setFilter] = useState<'pending' | 'done'>('pending');

  useEffect(() => { load(); }, [filter]);

  async function load() {
    setLoading(true);
    try {
      const res = await api.get(`/tasks?status=${filter}`);
      setTasks(res.data);
    } catch {}
    setLoading(false);
  }

  async function markDone(id: string) {
    setMarking(id);
    try {
      await api.patch(`/tasks/${id}/done`);
      setTasks((prev) => prev.filter((t) => t.id !== id));
    } catch {}
    setMarking(null);
  }

  const isOverdue = (t: Task) =>
    !t.done && t.dueDate && new Date(t.dueDate) < new Date();

  return (
    <SafeAreaView style={s.safe}>
      {/* Filtro */}
      <View style={s.tabs}>
        {(['pending', 'done'] as const).map((f) => (
          <TouchableOpacity key={f} onPress={() => setFilter(f)} style={[s.tab, filter === f && s.tabActive]}>
            <Text style={[s.tabText, filter === f && s.tabTextActive]}>
              {f === 'pending' ? 'Pendentes' : 'Concluídas'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={s.content}>
        {loading
          ? [1, 2, 3].map((i) => <SkeletonCard key={i} height={72} />)
          : tasks.length === 0
            ? <EmptyState icon={filter === 'pending' ? '🎉' : '📋'} message={filter === 'pending' ? 'Nenhuma tarefa pendente!' : 'Nenhuma tarefa concluída ainda'} />
            : tasks.map((task) => (
                <Card key={task.id}>
                  <View style={row.row}>
                    <Text style={s.icon}>{TYPE_ICONS[task.type] ?? '📌'}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={s.title}>{task.title}</Text>
                      {task.dueDate && (
                        <Text style={[s.due, isOverdue(task) && s.dueOverdue]}>
                          Prazo: {new Date(task.dueDate).toLocaleDateString('pt-BR')}
                          {isOverdue(task) ? ' ⚠️ Atrasada' : ''}
                        </Text>
                      )}
                    </View>
                    {filter === 'pending' && (
                      <TouchableOpacity
                        onPress={() => markDone(task.id)}
                        disabled={marking === task.id}
                        style={[s.checkBtn, marking === task.id && { opacity: 0.5 }]}
                      >
                        <Text style={s.checkText}>{marking === task.id ? '...' : '✓'}</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </Card>
              ))
        }
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  tabs: { flexDirection: 'row', backgroundColor: '#fff', borderBottomWidth: 1, borderColor: colors.border },
  tab: { flex: 1, paddingVertical: 12, alignItems: 'center' },
  tabActive: { borderBottomWidth: 2, borderColor: colors.primary },
  tabText: { fontSize: 14, color: colors.muted },
  tabTextActive: { color: colors.primary, fontWeight: '600' },
  content: { padding: 16, paddingBottom: 40 },
  icon: { fontSize: 22, marginRight: 8 },
  title: { fontSize: 15, fontWeight: '600', color: colors.text },
  due: { fontSize: 12, color: colors.muted, marginTop: 2 },
  dueOverdue: { color: colors.danger },
  checkBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#DCFCE7', alignItems: 'center', justifyContent: 'center' },
  checkText: { fontSize: 18, color: colors.success },
});
const row = StyleSheet.create({ row: { flexDirection: 'row', alignItems: 'center' } });
