import { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, SafeAreaView } from 'react-native';
import { api } from '../../../lib/api';
import { Card, SkeletonCard, EmptyState, colors } from '../../../components/ui';

interface Progress {
  id: string;
  level: string;
  notes: string | null;
  subject?: { name: string; color?: string };
  updatedAt: string;
}

const LEVEL_CONFIG: Record<string, { label: string; color: string; bg: string; steps: number }> = {
  iniciante:     { label: 'Iniciante',     color: '#6B7280', bg: '#F3F4F6', steps: 1 },
  basico:        { label: 'Básico',        color: '#2563EB', bg: '#DBEAFE', steps: 2 },
  intermediario: { label: 'Intermediário', color: '#7C3AED', bg: '#EDE9FE', steps: 3 },
  avancado:      { label: 'Avançado',      color: '#16A34A', bg: '#DCFCE7', steps: 4 },
};

function LevelBar({ level }: { level: string }) {
  const cfg = LEVEL_CONFIG[level] ?? LEVEL_CONFIG.iniciante;
  return (
    <View style={bar.container}>
      {[1, 2, 3, 4].map((i) => (
        <View
          key={i}
          style={[bar.step, { backgroundColor: i <= cfg.steps ? cfg.color : '#E5E7EB' }]}
        />
      ))}
    </View>
  );
}

export default function StudentProgress() {
  const [progress, setProgress] = useState<Progress[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/progress/me').then((r) => setProgress(r.data)).finally(() => setLoading(false));
  }, []);

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.headerBar}>
        <Text style={s.title}>Minha Evolução</Text>
      </View>
      <ScrollView contentContainerStyle={s.content}>
        {loading
          ? [1, 2, 3].map((i) => <SkeletonCard key={i} height={100} />)
          : progress.length === 0
            ? <EmptyState icon="📈" message="Nenhum progresso registrado ainda" />
            : progress.map((p) => {
                const cfg = LEVEL_CONFIG[p.level] ?? LEVEL_CONFIG.iniciante;
                return (
                  <Card key={p.id}>
                    <View style={row.between}>
                      <Text style={s.subjectName}>{p.subject?.name ?? 'Disciplina'}</Text>
                      <View style={[s.badge, { backgroundColor: cfg.bg }]}>
                        <Text style={[s.badgeText, { color: cfg.color }]}>{cfg.label}</Text>
                      </View>
                    </View>
                    <LevelBar level={p.level} />
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
  content: { padding: 16, paddingBottom: 40 },
  subjectName: { fontSize: 16, fontWeight: '700', color: colors.text },
  badge: { borderRadius: 99, paddingHorizontal: 10, paddingVertical: 3 },
  badgeText: { fontSize: 12, fontWeight: '600' },
  notes: { fontSize: 13, color: colors.muted, marginTop: 8, fontStyle: 'italic' },
  updatedAt: { fontSize: 11, color: colors.muted, marginTop: 6 },
});
const bar = StyleSheet.create({
  container: { flexDirection: 'row', gap: 4, marginTop: 10, marginBottom: 4 },
  step: { flex: 1, height: 6, borderRadius: 3 },
});
const row = StyleSheet.create({ between: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' } });
