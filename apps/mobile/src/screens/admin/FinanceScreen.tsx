import { useCallback, useEffect, useState } from 'react';
import { View, Text, ScrollView, TextInput, TouchableOpacity, StyleSheet, Alert, Modal, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '../../../lib/api';
import { Card, Badge, Button, SkeletonCard, EmptyState, colors } from '../../../components/ui';
import { StudentPicker, StudentLite } from './shared/StudentPicker';

interface Plan { id: string; name: string; totalLessons: number; price: number; }
interface Payment { id: string; studentId: string; amount: number; method: string | null; status: string; createdAt: string; }

const METHODS = [
  { value: 'pix', label: 'Pix' },
  { value: 'dinheiro', label: 'Dinheiro' },
  { value: 'cartao', label: 'Cartão' },
  { value: 'transferencia', label: 'Transferência' },
] as const;

const STATUS_VARIANT: Record<string, 'success' | 'warning' | 'muted'> = {
  pago: 'success',
  pendente: 'warning',
  cancelado: 'muted',
};
const STATUS_LABEL: Record<string, string> = { pago: 'Pago', pendente: 'Pendente', cancelado: 'Cancelado' };

function formatCurrency(value: number) {
  return `R$ ${Number(value).toFixed(2).replace('.', ',')}`;
}

export function FinanceScreen() {
  const [section, setSection] = useState<'pacotes' | 'pagamentos'>('pacotes');
  const [students, setStudents] = useState<StudentLite[]>([]);

  useEffect(() => {
    api.get('/auth/users?role=student').then((res) => setStudents(res.data)).catch(() => {});
  }, []);

  const studentName = (id: string) => students.find((st) => st.id === id)?.name ?? 'Aluno';

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.header}>
        <Text style={s.headerTitle}>Financeiro</Text>
      </View>

      <View style={s.segmentRow}>
        {(['pacotes', 'pagamentos'] as const).map((sec) => (
          <TouchableOpacity key={sec} onPress={() => setSection(sec)} style={[s.segment, section === sec && s.segmentActive]}>
            <Text style={[s.segmentText, section === sec && s.segmentTextActive]}>
              {sec === 'pacotes' ? 'Pacotes' : 'Pagamentos'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {section === 'pacotes'
        ? <PlansSection />
        : <PaymentsSection students={students} studentName={studentName} />
      }
    </SafeAreaView>
  );
}

// ── Pacotes ────────────────────────────────────────────────────────────────

function PlansSection() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [totalLessons, setTotalLessons] = useState('');
  const [price, setPrice] = useState('');
  const [saving, setSaving] = useState(false);
  const [enrollingPlan, setEnrollingPlan] = useState<Plan | null>(null);
  const [enrolling, setEnrolling] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await api.get('/plans');
      setPlans(res.data);
    } catch {}
  }, []);

  useEffect(() => { load().finally(() => setLoading(false)); }, [load]);

  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  async function create() {
    if (!name.trim() || !totalLessons || !price) {
      Alert.alert('Campos obrigatórios', 'Preencha nome, nº de aulas e preço');
      return;
    }
    setSaving(true);
    try {
      await api.post('/plans', { name: name.trim(), totalLessons: Number(totalLessons), price: Number(price.replace(',', '.')) });
      await load();
      setCreating(false); setName(''); setTotalLessons(''); setPrice('');
    } catch {
      Alert.alert('Erro', 'Não foi possível criar o pacote');
    }
    setSaving(false);
  }

  function remove(id: string) {
    Alert.alert('Excluir pacote', 'Deseja excluir este pacote?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Excluir', style: 'destructive', onPress: async () => {
          await api.delete(`/plans/${id}`);
          setPlans((prev) => prev.filter((p) => p.id !== id));
        },
      },
    ]);
  }

  async function enrollStudent(student: StudentLite) {
    if (!enrollingPlan) return;
    setEnrolling(true);
    try {
      await api.post('/student-plans', { studentId: student.id, planId: enrollingPlan.id });
      setEnrollingPlan(null);
      Alert.alert('Matriculado!', `${student.name} matriculado(a) no pacote "${enrollingPlan.name}".`);
    } catch (e: any) {
      Alert.alert('Erro', e.response?.data?.message ?? 'Não foi possível matricular o aluno');
    }
    setEnrolling(false);
  }

  return (
    <>
      <ScrollView contentContainerStyle={s.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
        <TouchableOpacity onPress={() => setCreating(!creating)} style={s.addBtn}>
          <Text style={s.addBtnText}>{creating ? '✕ Cancelar' : '+ Novo pacote'}</Text>
        </TouchableOpacity>

        {creating && (
          <Card style={{ marginTop: 12 }}>
            <Text style={s.label}>Nome</Text>
            <TextInput style={s.input} value={name} onChangeText={setName} placeholder="Ex: 10 aulas de Matemática" />
            <Text style={s.label}>Nº de aulas</Text>
            <TextInput style={s.input} value={totalLessons} onChangeText={setTotalLessons} placeholder="Ex: 10" keyboardType="number-pad" />
            <Text style={s.label}>Preço (R$)</Text>
            <TextInput style={s.input} value={price} onChangeText={setPrice} placeholder="Ex: 300" keyboardType="decimal-pad" />
            <Button label={saving ? 'Criando...' : 'Criar pacote'} onPress={create} loading={saving} style={{ marginTop: 12 }} />
          </Card>
        )}

        <View style={{ height: 12 }} />
        {loading
          ? [1, 2, 3].map((i) => <SkeletonCard key={i} height={80} />)
          : plans.length === 0
            ? <EmptyState icon="💳" message="Nenhum pacote cadastrado" />
            : plans.map((plan) => (
                <Card key={plan.id} style={{ marginBottom: 8 }}>
                  <View style={s.itemRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={s.itemName}>{plan.name}</Text>
                      <Text style={s.planMeta}>{plan.totalLessons} aulas · {formatCurrency(plan.price)}</Text>
                    </View>
                    <TouchableOpacity onPress={() => remove(plan.id)}>
                      <Text style={s.del}>🗑</Text>
                    </TouchableOpacity>
                  </View>
                  <Button label="+ Matricular aluno" variant="ghost" onPress={() => setEnrollingPlan(plan)} style={{ marginTop: 10 }} />
                </Card>
              ))
        }
      </ScrollView>

      <Modal visible={!!enrollingPlan} transparent animationType="slide">
        <View style={s.modalOverlay}>
          <View style={s.modalSheet}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>Matricular em "{enrollingPlan?.name}"</Text>
              <TouchableOpacity onPress={() => setEnrollingPlan(null)}>
                <Text style={s.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={{ paddingBottom: 16 }}>
              {enrolling
                ? <Text style={s.hint}>Matriculando...</Text>
                : <StudentPicker onSelect={enrollStudent} />
              }
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
}

// ── Pagamentos ─────────────────────────────────────────────────────────────

function PaymentsSection({ students, studentName }: { students: StudentLite[]; studentName: (id: string) => string }) {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [creating, setCreating] = useState(false);
  const [pickingStudent, setPickingStudent] = useState(false);
  const [student, setStudent] = useState<StudentLite | null>(null);
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('pix');
  const [status, setStatus] = useState('pago');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await api.get('/payments');
      setPayments(res.data);
    } catch {}
  }, []);

  useEffect(() => { load().finally(() => setLoading(false)); }, [load]);

  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  async function create() {
    if (!student || !amount) {
      Alert.alert('Campos obrigatórios', 'Selecione o aluno e informe o valor');
      return;
    }
    setSaving(true);
    try {
      await api.post('/payments', { studentId: student.id, amount: Number(amount.replace(',', '.')), method, status });
      await load();
      setCreating(false); setStudent(null); setAmount(''); setMethod('pix'); setStatus('pago');
    } catch {
      Alert.alert('Erro', 'Não foi possível registrar o pagamento');
    }
    setSaving(false);
  }

  return (
    <>
      <ScrollView contentContainerStyle={s.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
        <TouchableOpacity onPress={() => setCreating(!creating)} style={s.addBtn}>
          <Text style={s.addBtnText}>{creating ? '✕ Cancelar' : '+ Novo pagamento'}</Text>
        </TouchableOpacity>

        {creating && (
          <Card style={{ marginTop: 12 }}>
            <Text style={s.label}>Aluno</Text>
            <TouchableOpacity onPress={() => setPickingStudent(true)} style={s.input}>
              <Text style={student ? s.pickerValue : s.pickerPlaceholder}>{student?.name ?? 'Selecionar aluno'}</Text>
            </TouchableOpacity>

            <Text style={s.label}>Valor (R$)</Text>
            <TextInput style={s.input} value={amount} onChangeText={setAmount} placeholder="Ex: 300" keyboardType="decimal-pad" />

            <Text style={s.label}>Método</Text>
            <View style={s.chipRow}>
              {METHODS.map((m) => (
                <TouchableOpacity key={m.value} onPress={() => setMethod(m.value)} style={[s.chip, method === m.value && s.chipActive]}>
                  <Text style={[s.chipText, method === m.value && s.chipActiveText]}>{m.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={s.label}>Status</Text>
            <View style={s.chipRow}>
              {(['pago', 'pendente'] as const).map((st) => (
                <TouchableOpacity key={st} onPress={() => setStatus(st)} style={[s.chip, status === st && s.chipActive]}>
                  <Text style={[s.chipText, status === st && s.chipActiveText]}>{STATUS_LABEL[st]}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Button label={saving ? 'Salvando...' : 'Registrar pagamento'} onPress={create} loading={saving} style={{ marginTop: 12 }} />
          </Card>
        )}

        <View style={{ height: 12 }} />
        {loading
          ? [1, 2, 3].map((i) => <SkeletonCard key={i} height={64} />)
          : payments.length === 0
            ? <EmptyState icon="💰" message="Nenhum pagamento registrado" />
            : payments.map((p) => (
                <Card key={p.id} style={{ marginBottom: 8 }}>
                  <View style={s.itemRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={s.itemName}>{studentName(p.studentId)}</Text>
                      <Text style={s.planMeta}>{formatCurrency(p.amount)} · {new Date(p.createdAt).toLocaleDateString('pt-BR')}</Text>
                    </View>
                    <Badge label={STATUS_LABEL[p.status] ?? p.status} variant={STATUS_VARIANT[p.status] ?? 'muted'} />
                  </View>
                </Card>
              ))
        }
      </ScrollView>

      <Modal visible={pickingStudent} transparent animationType="slide">
        <View style={s.modalOverlay}>
          <View style={s.modalSheet}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>Selecionar aluno</Text>
              <TouchableOpacity onPress={() => setPickingStudent(false)}>
                <Text style={s.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={{ paddingBottom: 16 }}>
              <StudentPicker onSelect={(st) => { setStudent(st); setPickingStudent(false); }} />
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: { padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderColor: colors.border },
  headerTitle: { fontSize: 18, fontWeight: '700', color: colors.text },
  segmentRow: { flexDirection: 'row', backgroundColor: '#fff', padding: 8, gap: 8, borderBottomWidth: 1, borderColor: colors.border },
  segment: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 8, backgroundColor: '#F3F4F6' },
  segmentActive: { backgroundColor: colors.primary },
  segmentText: { fontSize: 13, fontWeight: '600', color: colors.muted },
  segmentTextActive: { color: '#fff' },
  content: { padding: 16, paddingBottom: 40 },
  addBtn: { backgroundColor: colors.primary, borderRadius: 8, paddingVertical: 10, alignItems: 'center' },
  addBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  label: { fontSize: 12, color: colors.muted, fontWeight: '600', marginBottom: 4, marginTop: 8 },
  input: { backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: colors.border, borderRadius: 8, padding: 10, fontSize: 14, color: colors.text, justifyContent: 'center' },
  pickerValue: { fontSize: 14, color: colors.text },
  pickerPlaceholder: { fontSize: 14, color: colors.muted },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderRadius: 20, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 12, paddingVertical: 6, backgroundColor: '#F9FAFB' },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: 13, color: colors.text },
  chipActiveText: { color: '#fff', fontWeight: '600' },
  itemRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  itemName: { fontSize: 14, fontWeight: '600', color: colors.text },
  planMeta: { fontSize: 12, color: colors.muted, marginTop: 2 },
  del: { fontSize: 16 },
  hint: { fontSize: 13, color: colors.muted, padding: 16, textAlign: 'center' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '85%', padding: 16 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  modalTitle: { fontSize: 16, fontWeight: '700', color: colors.text, flex: 1 },
  modalClose: { fontSize: 18, color: colors.muted, paddingHorizontal: 8 },
});
