import { useCallback, useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '../../../lib/api';
import { Card, SkeletonCard, EmptyState, colors } from '../../../components/ui';
import { useGuardianStudent } from '../../hooks/useGuardianStudent';

interface GuardianReport {
  student: { id: string; name: string };
  attendanceRate: number;
  totalSessions: number;
  presentCount: number;
  pendingTasks: number;
  lessonsRemaining: number;
  progressBySubject: Array<{ subjectName: string; level: string }>;
}

const LEVEL_COLORS: Record<string, string> = {
  iniciante: '#6B7280', basico: '#2563EB', intermediario: '#7C3AED', avancado: '#16A34A',
};

export function HomeScreen() {
  const { students, selected, setSelected, loadingStudents } = useGuardianStudent();
  const [report, setReport] = useState<GuardianReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!selected) return;
    setLoading(true);
    try {
      const r = await api.get(`/reports/guardian/student/${selected.id}`);
      setReport(r.data);
    } catch {}
    setLoading(false);
  }, [selected]);

  useEffect(() => { load(); }, [load]);

  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const isLoading = loadingStudents || loading;

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.headerBar}>
        <Text style={s.greeting}>Acompanhamento</Text>
        {report && <Text style={s.studentName}>{report.student.name}</Text>}
      </View>

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
        {isLoading ? (
          [1, 2, 3].map((i) => <SkeletonCard key={i} height={88} />)
        ) : !selected ? (
          <EmptyState icon="👤" message="Nenhum aluno vinculado" />
        ) : !report ? (
          <EmptyState icon="📊" message="Sem dados para exibir" />
        ) : (
          <>
            {report.lessonsRemaining <= 2 && (
              <View style={s.alert}>
                <Text style={s.alertText}>⚠️ Saldo baixo: apenas {report.lessonsRemaining} aula(s) restante(s)</Text>
              </View>
            )}
            <View style={grid.row}>
              <KpiCard label="Frequência" value={`${report.attendanceRate ?? 0}%`} color="#16A34A" />
              <KpiCard label="Aulas realizadas" value={String(report.presentCount ?? 0)} color="#6B7280" />
              <KpiCard label="Tarefas" value={String(report.pendingTasks ?? 0)} color={(report.pendingTasks ?? 0) > 0 ? '#D97706' : '#16A34A'} />
            </View>
            {report.progressBySubject.length > 0 && (
              <>
                <Text style={s.section}>Evolução por disciplina</Text>
                {report.progressBySubject.map((item) => (
                  <Card key={item.subjectName}>
                    <View style={row.between}>
                      <Text style={s.subjectName}>{item.subjectName}</Text>
                      <Text style={[s.level, { color: LEVEL_COLORS[item.level] ?? colors.muted }]}>{item.level}</Text>
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

function KpiCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <View style={[kpi.card, { borderTopColor: color, borderTopWidth: 3 }]}>
      <Text style={[kpi.value, { color }]}>{value}</Text>
      <Text style={kpi.label}>{label}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  headerBar: { backgroundColor: '#fff', padding: 16, borderBottomWidth: 1, borderColor: colors.border },
  greeting: { fontSize: 14, color: colors.muted },
  studentName: { fontSize: 22, fontWeight: '700', color: colors.text },
  selectorBar: { backgroundColor: '#fff', maxHeight: 52, borderBottomWidth: 1, borderColor: colors.border },
  chip: { borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6, backgroundColor: '#F3F4F6', borderWidth: 1, borderColor: colors.border },
  chipActive: { backgroundColor: '#DBEAFE', borderColor: colors.primary },
  chipText: { fontSize: 13, color: colors.muted },
  chipTextActive: { color: colors.primary, fontWeight: '700' },
  content: { padding: 16, paddingBottom: 40 },
  alert: { backgroundColor: '#FEF3C7', borderRadius: 10, padding: 12, marginBottom: 12 },
  alertText: { fontSize: 13, color: '#92400E', fontWeight: '600' },
  section: { fontSize: 13, fontWeight: '700', color: colors.muted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8, marginTop: 8 },
  subjectName: { fontSize: 15, fontWeight: '600', color: colors.text, flexShrink: 1 },
  level: { fontSize: 13, fontWeight: '600', textTransform: 'capitalize' },
});
const grid = StyleSheet.create({ row: { flexDirection: 'row', gap: 8, marginBottom: 16 } });
const kpi = StyleSheet.create({
  card: { flex: 1, backgroundColor: '#fff', borderRadius: 12, padding: 12, alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, elevation: 2 },
  value: { fontSize: 24, fontWeight: '700' },
  label: { fontSize: 11, color: colors.muted, marginTop: 2, textAlign: 'center' },
});
const row = StyleSheet.create({ between: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' } });
