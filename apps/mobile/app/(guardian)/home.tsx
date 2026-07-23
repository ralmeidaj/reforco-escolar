import { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, SafeAreaView } from 'react-native';
import { api } from '../../lib/api';
import { Card, SkeletonCard, EmptyState, colors } from '../../components/ui';

interface GuardianReport {
  studentName: string;
  attendanceRate: number;
  absences: number;
  pendingTasks: number;
  lessonsRemaining: number | null;
  lowBalance: boolean;
  levelBySubject: Array<{ subjectName: string; level: string }>;
}

const LEVEL_COLORS: Record<string, string> = {
  iniciante: '#6B7280', basico: '#2563EB', intermediario: '#7C3AED', avancado: '#16A34A',
};

export default function GuardianHome() {
  const [report, setReport] = useState<GuardianReport | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/reports/guardian/me').then((r) => setReport(r.data)).finally(() => setLoading(false));
  }, []);

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.headerBar}>
        <Text style={s.greeting}>Acompanhamento</Text>
        {report && <Text style={s.studentName}>{report.studentName}</Text>}
      </View>
      <ScrollView contentContainerStyle={s.content}>
        {loading ? (
          [1, 2, 3].map((i) => <SkeletonCard key={i} height={88} />)
        ) : !report ? (
          <EmptyState icon="👤" message="Nenhum aluno vinculado" />
        ) : (
          <>
            {report.lowBalance && (
              <View style={s.alert}>
                <Text style={s.alertText}>⚠️ Saldo baixo: apenas {report.lessonsRemaining} aula(s) restante(s)</Text>
              </View>
            )}
            <View style={grid.row}>
              <KpiCard label="Frequência" value={`${report.attendanceRate}%`} color="#16A34A" />
              <KpiCard label="Faltas" value={String(report.absences)} color={report.absences > 2 ? '#DC2626' : '#6B7280'} />
              <KpiCard label="Tarefas" value={String(report.pendingTasks)} color={report.pendingTasks > 0 ? '#D97706' : '#16A34A'} />
            </View>
            {report.levelBySubject.length > 0 && (
              <>
                <Text style={s.section}>Evolução por disciplina</Text>
                {report.levelBySubject.map((item) => (
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
  content: { padding: 16, paddingBottom: 40 },
  alert: { backgroundColor: '#FEF3C7', borderRadius: 10, padding: 12, marginBottom: 12 },
  alertText: { fontSize: 13, color: '#92400E', fontWeight: '600' },
  section: { fontSize: 13, fontWeight: '700', color: colors.muted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8, marginTop: 8 },
  subjectName: { fontSize: 15, fontWeight: '600', color: colors.text },
  level: { fontSize: 13, fontWeight: '600', textTransform: 'capitalize' },
});
const grid = StyleSheet.create({ row: { flexDirection: 'row', gap: 8, marginBottom: 16 } });
const kpi = StyleSheet.create({
  card: { flex: 1, backgroundColor: '#fff', borderRadius: 12, padding: 12, alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, elevation: 2 },
  value: { fontSize: 24, fontWeight: '700' },
  label: { fontSize: 11, color: colors.muted, marginTop: 2, textAlign: 'center' },
});
const row = StyleSheet.create({ between: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' } });
