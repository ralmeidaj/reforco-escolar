import { useCallback, useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, SafeAreaView, TouchableOpacity } from 'react-native';
import { api } from '../../../lib/api';
import { Card, SkeletonCard, colors } from '../../../components/ui';

interface KPIs {
  activeStudents: number;
  attendancePercent: number;
  revenueMonth: number;
  sessionsToday: number;
  absencesToday: number;
  lowBalanceStudents: number;
}

interface AbsenceAlert { id: string; studentName: string; guardianName: string; sessionDate: string; }

function KPICard({ icon, label, value, color }: { icon: string; label: string; value: string | number; color?: string }) {
  return (
    <Card style={kpi.card}>
      <Text style={kpi.icon}>{icon}</Text>
      <Text style={[kpi.value, color ? { color } : {}]}>{value}</Text>
      <Text style={kpi.label}>{label}</Text>
    </Card>
  );
}

export default function AdminDashboard() {
  const [data, setData] = useState<KPIs | null>(null);
  const [absences, setAbsences] = useState<AbsenceAlert[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    Promise.all([
      api.get('/reports/admin/kpis'),
      api.get('/attendance/absences/today'),
    ]).then(([kpisRes, absRes]) => {
      setData(kpisRes.data);
      setAbsences(absRes.data);
    }).finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const brlFormat = (v: number) =>
    v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.header}>
        <Text style={s.title}>Dashboard</Text>
        <TouchableOpacity onPress={load} style={s.refreshBtn}>
          <Text style={s.refreshText}>↻</Text>
        </TouchableOpacity>
      </View>
      <ScrollView contentContainerStyle={s.content}>
        {loading || !data
          ? [1, 2, 3, 4].map((i) => <SkeletonCard key={i} height={90} />)
          : <>
              <Text style={s.section}>Hoje</Text>
              <View style={s.grid}>
                <KPICard icon="📅" label="Aulas hoje" value={data.sessionsToday} />
                <KPICard icon="❌" label="Faltas hoje" value={data.absencesToday} color={data.absencesToday > 0 ? colors.danger : undefined} />
              </View>
              <Text style={s.section}>Geral</Text>
              <View style={s.grid}>
                <KPICard icon="👥" label="Alunos ativos" value={data.activeStudents} />
                <KPICard icon="📊" label="Frequência" value={`${data.attendancePercent}%`} color={data.attendancePercent < 75 ? colors.warning : colors.success} />
                <KPICard icon="💰" label="Receita mês" value={brlFormat(data.revenueMonth)} />
                <KPICard icon="⚠️" label="Saldo baixo" value={data.lowBalanceStudents} color={data.lowBalanceStudents > 0 ? colors.warning : undefined} />
              </View>

              {absences.length > 0 && (
                <>
                  <Text style={s.section}>Faltas de hoje</Text>
                  {absences.map((a) => (
                    <Card key={a.id} style={{ marginBottom: 8 }}>
                      <Text style={s.absenceName}>{a.studentName}</Text>
                      <Text style={s.absenceGuardian}>Responsável: {a.guardianName}</Text>
                      <Text style={s.absenceTime}>
                        {new Date(a.sessionDate).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </Text>
                    </Card>
                  ))}
                </>
              )}
            </>
        }
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderColor: colors.border },
  title: { fontSize: 20, fontWeight: '700', color: colors.text },
  refreshBtn: { padding: 8 },
  refreshText: { fontSize: 20, color: colors.primary },
  content: { padding: 16, paddingBottom: 40 },
  section: { fontSize: 12, fontWeight: '700', color: colors.muted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8, marginTop: 8 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 8 },
  absenceName: { fontSize: 15, fontWeight: '700', color: colors.text },
  absenceGuardian: { fontSize: 12, color: colors.muted, marginTop: 2 },
  absenceTime: { fontSize: 12, color: colors.muted, marginTop: 2 },
});
const kpi = StyleSheet.create({
  card: { flex: 1, minWidth: '45%', alignItems: 'center', paddingVertical: 14 },
  icon: { fontSize: 22, marginBottom: 4 },
  value: { fontSize: 22, fontWeight: '800', color: colors.text },
  label: { fontSize: 11, color: colors.muted, marginTop: 2, textAlign: 'center' },
});
