import { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, SafeAreaView } from 'react-native';
import { api } from '../../../lib/api';
import { Card, SkeletonCard, EmptyState, colors } from '../../../components/ui';

interface Progress { id: string; level: string; notes: string | null; subject?: { name: string }; updatedAt: string; }

const LEVEL_CONFIG: Record<string, { label: string; color: string; steps: number }> = {
  iniciante:     { label: 'Iniciante',     color: '#6B7280', steps: 1 },
  basico:        { label: 'Básico',        color: '#2563EB', steps: 2 },
  intermediario: { label: 'Intermediário', color: '#7C3AED', steps: 3 },
  avancado:      { label: 'Avançado',      color: '#16A34A', steps: 4 },
};

export default function GuardianProgress() {
  const [progress, setProgress] = useState<Progress[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/progress/student/me').then((r) => setProgress(r.data)).finally(() => setLoading(false));
  }, []);

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.headerBar}><Text style={s.title}>Evolução do aluno</Text></View>
      <ScrollView contentContainerStyle={s.content}>
        {loading
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
  content: { padding: 16, paddingBottom: 40 },
  subjectName: { fontSize: 15, fontWeight: '700', color: colors.text },
  level: { fontSize: 13, fontWeight: '600' },
  notes: { fontSize: 13, color: colors.muted, marginTop: 6, fontStyle: 'italic' },
});
const bar = StyleSheet.create({
  container: { flexDirection: 'row', gap: 4, marginTop: 10 },
  step: { flex: 1, height: 6, borderRadius: 3 },
});
const row = StyleSheet.create({ between: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' } });
