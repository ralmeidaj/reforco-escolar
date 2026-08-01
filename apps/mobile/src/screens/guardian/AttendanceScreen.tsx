import { useCallback, useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, SafeAreaView, RefreshControl } from 'react-native';
import { api } from '../../../lib/api';
import { Card, Badge, SkeletonCard, EmptyState, colors } from '../../../components/ui';
import { useGuardianStudent } from '../../hooks/useGuardianStudent';

interface Attendance {
  id: string;
  status: string;
  justification: string | null;
  session?: { scheduledAt: string; subject?: { name: string } };
}

const STATUS_MAP: Record<string, { label: string; variant: string }> = {
  presente:    { label: 'Presente',    variant: 'success' },
  ausente:     { label: 'Ausente',     variant: 'danger' },
  justificado: { label: 'Justificado', variant: 'warning' },
};

export function AttendanceScreen() {
  const { students, selected, setSelected, loadingStudents } = useGuardianStudent();
  const [records, setRecords] = useState<Attendance[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({ total: 0, present: 0, absent: 0, rate: 0 });

  const load = useCallback(async () => {
    if (!selected) return;
    setLoading(true);
    try {
      const { data } = await api.get<Attendance[]>(`/attendances/student/${selected.id}`);
      setRecords(data);
      const total = data.length;
      const present = data.filter((a) => a.status === 'presente').length;
      const absent = data.filter((a) => a.status === 'ausente').length;
      setStats({ total, present, absent, rate: total ? Math.round((present / total) * 100) : 0 });
    } catch {}
    setLoading(false);
  }, [selected]);

  useEffect(() => { load(); }, [load]);

  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.headerBar}><Text style={s.title}>Frequência</Text></View>

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
        {(loadingStudents || loading) ? (
          [1, 2, 3].map((i) => <SkeletonCard key={i} />)
        ) : (
          <>
            <View style={grid.row}>
              <StatBox label="Total"     value={stats.total}   color={colors.primary} />
              <StatBox label="Presenças" value={stats.present} color="#16A34A" />
              <StatBox label="Faltas"    value={stats.absent}  color="#DC2626" />
              <StatBox label="%"         value={stats.rate}    color="#7C3AED" suffix="%" />
            </View>
            {records.length === 0
              ? <EmptyState icon="📅" message="Nenhum registro de frequência" />
              : records.map((a) => (
                  <Card key={a.id}>
                    <View style={row.between}>
                      <View>
                        <Text style={s.subject}>{a.session?.subject?.name ?? 'Aula'}</Text>
                        <Text style={s.date}>
                          {a.session?.scheduledAt
                            ? new Date(a.session.scheduledAt).toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' })
                            : '—'}
                        </Text>
                        {a.justification && <Text style={s.just}>Justificativa: {a.justification}</Text>}
                      </View>
                      <Badge label={STATUS_MAP[a.status]?.label ?? a.status} variant={STATUS_MAP[a.status]?.variant ?? 'muted'} />
                    </View>
                  </Card>
                ))
            }
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function StatBox({ label, value, color, suffix = '' }: { label: string; value: number; color: string; suffix?: string }) {
  return (
    <View style={[sb.box, { borderTopColor: color, borderTopWidth: 3 }]}>
      <Text style={[sb.value, { color }]}>{value}{suffix}</Text>
      <Text style={sb.label}>{label}</Text>
    </View>
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
  subject: { fontSize: 15, fontWeight: '600', color: colors.text },
  date: { fontSize: 12, color: colors.muted, marginTop: 2 },
  just: { fontSize: 12, color: colors.warning, marginTop: 2 },
});
const grid = StyleSheet.create({ row: { flexDirection: 'row', gap: 6, marginBottom: 16 } });
const sb = StyleSheet.create({
  box: { flex: 1, backgroundColor: '#fff', borderRadius: 10, padding: 10, alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
  value: { fontSize: 20, fontWeight: '700' },
  label: { fontSize: 10, color: colors.muted, marginTop: 2 },
});
const row = StyleSheet.create({ between: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' } });
