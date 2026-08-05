import { useCallback, useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '../../../lib/api';
import { Card, SkeletonCard, EmptyState, colors } from '../../../components/ui';
import { useGuardianStudent } from '../../hooks/useGuardianStudent';

interface Progress { id: string; level: string; notes: string | null; subject?: { name: string }; updatedAt: string; }

const LEVEL_CONFIG: Record<string, { label: string; color: string; steps: number }> = {
  iniciante:     { label: 'Iniciante',     color: '#6B7280', steps: 1 },
  basico:        { label: 'Básico',        color: '#2563EB', steps: 2 },
  intermediario: { label: 'Intermediário', color: '#7C3AED', steps: 3 },
  avancado:      { label: 'Avançado',      color: '#16A34A', steps: 4 },
};

export function ProgressScreen() {
  const { students, selected, setSelected, loadingStudents } = useGuardianStudent();
  const [progress, setProgress] = useState<Progress[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!selected) return;
    setLoading(true);
    try {
      const r = await api.get(`/progress/student/${selected.id}`);
      setProgress(r.data);
    } catch {}
    setLoading(false);
  }, [selected]);

  useEffect(() => { load(); }, [load]);

  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.headerBar}><Text style={s.title}>Evolução do aluno</Text></View>

      {students.length > 1 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.selectorBar} contentContainerStyle={{ paddingHorizontal: 12, gap: 8, alignItems: 'center' }}>
          {students.map((st) => (
            <TouchableOpacity key={st.id} onPress={() => setSelected(st)} style={[s.chip, selected?.id === st.id && s.chipActive]}>
              <Text style={[s.chipText, selected?.id === st.id && s.chipTextActive]}>{st.name.split(' ')[0]}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      <ScrollView
        contentContainerStyle={s.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {(loadingStudents || loading)
          ? [1, 2, 3].map((i) => <SkeletonCard key={i} height={100} />)
          : progress.length === 0
            ? <EmptyState icon="📈" message="Nenhum progresso registrado" />
            : progress.map((p) => {
                const cfg = LEVEL_CONFIG[p.level] ?? LEVEL_CONFIG.iniciante;
                return (
                  <Card key={p.id}>
                    <View style={row.between}>
                      <Text style={s.subjectName}>{p.subject?.name ?? '—'}</Text>
                      <Text style={[s.level, { color: cfg.color }]}>{cfg.label}</Text>
                    </View>
                    <View style={bar.container}>
                      {[1,2,3,4].map((i) => (
                        <View key={i} style={[bar.step, { backgroundColor: i <= cfg.steps ? cfg.color : '#E5E7EB' }]} />
                      ))}
                    </View>
                    {p.notes && <Text style={s.notes}>{p.notes}</Text>}
                    <Text style={s.updatedAt}>Atualizado em {new Date(p.updatedAt).toLocaleDateString('pt-BR')}</Text>
                  </Card>
                );
              })
        }
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  headerBar: { backgroundColor: '#fff', padding: 16, borderBottomWidth: 1, borderColor: colors.border },
  title: { fontSize: 20, fontWeight: '700', color: colors.text },
  selectorBar: { backgroundColor: '#fff', maxHeight: 52, borderBottomWidth: 1, borderColor: colors.border },
  chip: { borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6, backgroundColor: '#F3F4F6', borderWidth: 1, borderColor: colors.border },
  chipActive: { backgroundColor: '#DBEAFE', borderColor: colors.primary },
  chipText: { fontSize: 13, color: colors.muted },
  chipTextActive: { color: colors.primary, fontWeight: '700' },
  content: { padding: 16, paddingBottom: 40 },
  subjectName: { fontSize: 15, fontWeight: '700', color: colors.text, flexShrink: 1 },
  level: { fontSize: 13, fontWeight: '600' },
  notes: { fontSize: 13, color: colors.muted, marginTop: 6, fontStyle: 'italic' },
  updatedAt: { fontSize: 11, color: colors.muted, marginTop: 4 },
});
const bar = StyleSheet.create({
  container: { flexDirection: 'row', gap: 4, marginTop: 10 },
  step: { flex: 1, height: 6, borderRadius: 3 },
});
const row = StyleSheet.create({ between: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' } });
