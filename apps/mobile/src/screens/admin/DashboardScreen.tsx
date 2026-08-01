import { useCallback, useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, SafeAreaView, TouchableOpacity, RefreshControl } from 'react-native';
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

function KPICard({ icon, label, value, color }: { icon: string; label: string; value: string | number; color?: string }) {
  return (
    <Card style={kpi.card}>
      <Text style={kpi.icon}>{icon}</Text>
      <Text style={[kpi.value, color ? { color } : {}]}>{value}</Text>
      <Text style={kpi.label}>{label}</Text>
    </Card>
  );
}

export function DashboardScreen() {
  const [data, setData] = useState<KPIs | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(() => {
    api.get('/reports/admin/kpis')
      .then(({ data }) => setData(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const brlFormat = (v: number | undefined | null) =>
    (v ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.header}>
        <Text style={s.title}>Dashboard</Text>
        <TouchableOpacity onPress={load} style={s.refreshBtn}>
          <Text style={s.refreshText}>↻</Text>
        </TouchableOpacity>
      </View>
      <ScrollView contentContainerStyle={s.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
        {loading || !data
          ? [1, 2, 3, 4].map((i) => <SkeletonCard key={i} height={90} />)
          : <>
              <Text style={s.section}>Hoje</Text>
              <View style={s.grid}>
                <KPICard icon="📅" label="Aulas hoje" value={data.sessionsToday ?? 0} />
                <KPICard icon="❌" label="Faltas hoje" value={data.absencesToday ?? 0} color={(data.absencesToday ?? 0) > 0 ? colors.danger : undefined} />
              </View>
              <Text style={s.section}>Geral</Text>
              <View style={s.grid}>
                <KPICard icon="👥" label="Alunos ativos" value={data.activeStudents ?? 0} />
                <KPICard icon="📊" label="Frequência" value={`${data.attendancePercent ?? 0}%`} color={(data.attendancePercent ?? 0) < 75 ? colors.warning : colors.success} />
                <KPICard icon="💰" label="Receita mês" value={brlFormat(data.revenueMonth)} />
                <KPICard icon="⚠️" label="Saldo baixo" value={data.lowBalanceStudents ?? 0} color={(data.lowBalanceStudents ?? 0) > 0 ? colors.warning : undefined} />
              </View>
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
});
const kpi = StyleSheet.create({
  card: { flex: 1, minWidth: '45%', alignItems: 'center', paddingVertical: 14 },
  icon: { fontSize: 22, marginBottom: 4 },
  value: { fontSize: 22, fontWeight: '800', color: colors.text },
  label: { fontSize: 11, color: colors.muted, marginTop: 2, textAlign: 'center' },
});
