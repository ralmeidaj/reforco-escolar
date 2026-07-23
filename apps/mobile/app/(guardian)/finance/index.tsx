import { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, SafeAreaView } from 'react-native';
import { api } from '../../../lib/api';
import { Card, Badge, SkeletonCard, EmptyState, colors } from '../../../components/ui';

interface StudentPlan {
  id: string;
  lessonsUsed: number;
  lessonsTotal: number;
  plan?: { name: string };
}
interface Payment {
  id: string;
  amount: number;
  status: string;
  method: string | null;
  paidAt: string | null;
  createdAt: string;
}

export default function GuardianFinance() {
  const [plans, setPlans] = useState<StudentPlan[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/finance/balance').then((r) => setPlans(r.data.studentPlans ?? [])),
      api.get('/finance/payments').then((r) => setPayments(r.data)),
    ]).finally(() => setLoading(false));
  }, []);

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.headerBar}><Text style={s.title}>Financeiro</Text></View>
      <ScrollView contentContainerStyle={s.content}>
        {loading ? (
          [1, 2].map((i) => <SkeletonCard key={i} height={100} />)
        ) : (
          <>
            <Text style={s.section}>Saldo de aulas</Text>
            {plans.length === 0
              ? <EmptyState icon="📦" message="Nenhum pacote ativo" />
              : plans.map((p) => {
                  const remaining = p.lessonsTotal - p.lessonsUsed;
                  const pct = Math.round((p.lessonsUsed / p.lessonsTotal) * 100);
                  const low = remaining <= 2;
                  return (
                    <Card key={p.id} style={low ? s.lowCard : undefined}>
                      <Text style={s.planName}>{p.plan?.name ?? 'Pacote'}</Text>
                      <View style={prog.bar}>
                        <View style={[prog.fill, { width: `${pct}%` as any, backgroundColor: low ? colors.danger : colors.primary }]} />
                      </View>
                      <View style={row.between}>
                        <Text style={s.planSub}>{p.lessonsUsed} de {p.lessonsTotal} aulas usadas</Text>
                        <Text style={[s.remaining, { color: low ? colors.danger : colors.success }]}>
                          {remaining} restante{remaining !== 1 ? 's' : ''}
                        </Text>
                      </View>
                      {low && <Text style={s.lowAlert}>⚠️ Saldo baixo! Renove o pacote.</Text>}
                    </Card>
                  );
                })
            }
            <Text style={s.section}>Histórico de pagamentos</Text>
            {payments.length === 0
              ? <EmptyState icon="💳" message="Nenhum pagamento registrado" />
              : payments.map((p) => (
                  <Card key={p.id}>
                    <View style={row.between}>
                      <View>
                        <Text style={s.payValue}>R$ {Number(p.amount).toFixed(2)}</Text>
                        <Text style={s.payDate}>
                          {p.paidAt
                            ? new Date(p.paidAt).toLocaleDateString('pt-BR')
                            : new Date(p.createdAt).toLocaleDateString('pt-BR')}
                          {p.method ? ` · ${p.method}` : ''}
                        </Text>
                      </View>
                      <Badge
                        label={p.status === 'pago' ? 'Pago' : p.status === 'pendente' ? 'Pendente' : p.status}
                        variant={p.status === 'pago' ? 'success' : 'warning'}
                      />
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

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  headerBar: { backgroundColor: '#fff', padding: 16, borderBottomWidth: 1, borderColor: colors.border },
  title: { fontSize: 20, fontWeight: '700', color: colors.text },
  content: { padding: 16, paddingBottom: 40 },
  section: { fontSize: 13, fontWeight: '700', color: colors.muted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8, marginTop: 4 },
  planName: { fontSize: 15, fontWeight: '700', color: colors.text, marginBottom: 10 },
  planSub: { fontSize: 12, color: colors.muted },
  remaining: { fontSize: 13, fontWeight: '700' },
  lowCard: { borderLeftWidth: 3, borderLeftColor: colors.danger },
  lowAlert: { fontSize: 12, color: colors.danger, marginTop: 6, fontWeight: '600' },
  payValue: { fontSize: 16, fontWeight: '700', color: colors.text },
  payDate: { fontSize: 12, color: colors.muted, marginTop: 2 },
  success: colors.success,
});
const prog = StyleSheet.create({
  bar: { height: 6, backgroundColor: '#E5E7EB', borderRadius: 3, marginBottom: 6, overflow: 'hidden' },
  fill: { height: 6, borderRadius: 3 },
});
const row = StyleSheet.create({ between: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' } });
