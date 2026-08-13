import { useCallback, useEffect, useState } from 'react';
import { View, Text, ScrollView, TextInput, TouchableOpacity, StyleSheet, Alert, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '../../../lib/api';
import { Card, Badge, Button, SkeletonCard, EmptyState, colors } from '../../../components/ui';
import { StudentPicker, StudentLite } from './shared/StudentPicker';

interface Subject { id: string; name: string; color: string; }
interface Group { id: string; name: string; level: string; }
interface Enrollment { id: string; subject: { id: string; name: string; color: string }; }

const COLOR_PALETTE = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16'];
const LEVELS = [
  { value: 'infantil', label: 'Infantil' },
  { value: 'fundamental', label: 'Fundamental' },
  { value: 'medio', label: 'Médio' },
] as const;

export function RegistrationsScreen() {
  const [section, setSection] = useState<'disciplinas' | 'turmas' | 'matriculas'>('disciplinas');

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.header}>
        <Text style={s.headerTitle}>Cadastros</Text>
      </View>

      <View style={s.segmentRow}>
        {(['disciplinas', 'turmas', 'matriculas'] as const).map((sec) => (
          <TouchableOpacity key={sec} onPress={() => setSection(sec)} style={[s.segment, section === sec && s.segmentActive]}>
            <Text style={[s.segmentText, section === sec && s.segmentTextActive]}>
              {sec === 'disciplinas' ? 'Disciplinas' : sec === 'turmas' ? 'Turmas' : 'Matrículas'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {section === 'disciplinas' && <SubjectsSection />}
      {section === 'turmas' && <GroupsSection />}
      {section === 'matriculas' && <EnrollmentsSection />}
    </SafeAreaView>
  );
}

// ── Disciplinas ────────────────────────────────────────────────────────────

function SubjectsSection() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [color, setColor] = useState(COLOR_PALETTE[0]);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await api.get('/subjects');
      setSubjects(res.data);
    } catch {}
  }, []);

  useEffect(() => { load().finally(() => setLoading(false)); }, [load]);

  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  async function create() {
    if (!name.trim()) { Alert.alert('Campo obrigatório', 'Preencha o nome da disciplina'); return; }
    setSaving(true);
    try {
      await api.post('/subjects', { name: name.trim(), color, icon: 'book' });
      await load();
      setCreating(false); setName(''); setColor(COLOR_PALETTE[0]);
    } catch {
      Alert.alert('Erro', 'Não foi possível criar a disciplina');
    }
    setSaving(false);
  }

  function remove(id: string) {
    Alert.alert('Excluir disciplina', 'Deseja excluir esta disciplina?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Excluir', style: 'destructive', onPress: async () => {
          await api.delete(`/subjects/${id}`);
          setSubjects((prev) => prev.filter((sub) => sub.id !== id));
        },
      },
    ]);
  }

  return (
    <ScrollView contentContainerStyle={s.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
      <TouchableOpacity onPress={() => setCreating(!creating)} style={s.addBtn}>
        <Text style={s.addBtnText}>{creating ? '✕ Cancelar' : '+ Nova disciplina'}</Text>
      </TouchableOpacity>

      {creating && (
        <Card style={{ marginTop: 12 }}>
          <Text style={s.label}>Nome</Text>
          <TextInput style={s.input} value={name} onChangeText={setName} placeholder="Ex: Matemática" />
          <Text style={s.label}>Cor</Text>
          <View style={s.colorRow}>
            {COLOR_PALETTE.map((c) => (
              <TouchableOpacity key={c} onPress={() => setColor(c)} style={[s.colorDot, { backgroundColor: c }, color === c && s.colorDotActive]} />
            ))}
          </View>
          <Button label={saving ? 'Criando...' : 'Criar disciplina'} onPress={create} loading={saving} style={{ marginTop: 12 }} />
        </Card>
      )}

      <View style={{ height: 12 }} />
      {loading
        ? [1, 2, 3].map((i) => <SkeletonCard key={i} height={56} />)
        : subjects.length === 0
          ? <EmptyState icon="📚" message="Nenhuma disciplina cadastrada" />
          : subjects.map((sub) => (
              <Card key={sub.id} style={{ marginBottom: 8 }}>
                <View style={s.itemRow}>
                  <View style={[s.dot, { backgroundColor: sub.color }]} />
                  <Text style={s.itemName}>{sub.name}</Text>
                  <TouchableOpacity onPress={() => remove(sub.id)}>
                    <Text style={s.del}>🗑</Text>
                  </TouchableOpacity>
                </View>
              </Card>
            ))
      }
    </ScrollView>
  );
}

// ── Turmas ─────────────────────────────────────────────────────────────────

function GroupsSection() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [level, setLevel] = useState<string>('fundamental');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await api.get('/groups');
      setGroups(res.data);
    } catch {}
  }, []);

  useEffect(() => { load().finally(() => setLoading(false)); }, [load]);

  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  async function create() {
    if (!name.trim()) { Alert.alert('Campo obrigatório', 'Preencha o nome da turma'); return; }
    setSaving(true);
    try {
      await api.post('/groups', { name: name.trim(), level });
      await load();
      setCreating(false); setName(''); setLevel('fundamental');
    } catch {
      Alert.alert('Erro', 'Não foi possível criar a turma');
    }
    setSaving(false);
  }

  function remove(id: string) {
    Alert.alert('Excluir turma', 'Deseja excluir esta turma?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Excluir', style: 'destructive', onPress: async () => {
          await api.delete(`/groups/${id}`);
          setGroups((prev) => prev.filter((g) => g.id !== id));
        },
      },
    ]);
  }

  const levelLabel = (value: string) => LEVELS.find((l) => l.value === value)?.label ?? value;

  return (
    <ScrollView contentContainerStyle={s.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
      <TouchableOpacity onPress={() => setCreating(!creating)} style={s.addBtn}>
        <Text style={s.addBtnText}>{creating ? '✕ Cancelar' : '+ Nova turma'}</Text>
      </TouchableOpacity>

      {creating && (
        <Card style={{ marginTop: 12 }}>
          <Text style={s.label}>Nome</Text>
          <TextInput style={s.input} value={name} onChangeText={setName} placeholder="Ex: 5º Ano A" />
          <Text style={s.label}>Nível</Text>
          <View style={s.chipRow}>
            {LEVELS.map((l) => (
              <TouchableOpacity key={l.value} onPress={() => setLevel(l.value)} style={[s.chip, level === l.value && s.chipActive]}>
                <Text style={[s.chipText, level === l.value && s.chipActiveText]}>{l.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <Button label={saving ? 'Criando...' : 'Criar turma'} onPress={create} loading={saving} style={{ marginTop: 12 }} />
        </Card>
      )}

      <View style={{ height: 12 }} />
      {loading
        ? [1, 2, 3].map((i) => <SkeletonCard key={i} height={56} />)
        : groups.length === 0
          ? <EmptyState icon="🎓" message="Nenhuma turma cadastrada" />
          : groups.map((g) => (
              <Card key={g.id} style={{ marginBottom: 8 }}>
                <View style={s.itemRow}>
                  <Text style={s.itemName}>{g.name}</Text>
                  <Badge label={levelLabel(g.level)} variant="primary" />
                  <TouchableOpacity onPress={() => remove(g.id)} style={{ marginLeft: 8 }}>
                    <Text style={s.del}>🗑</Text>
                  </TouchableOpacity>
                </View>
              </Card>
            ))
      }
    </ScrollView>
  );
}

// ── Matrículas ───────────────────────────────────────────────────────────────

function EnrollmentsSection() {
  const [selected, setSelected] = useState<StudentLite | null>(null);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (selected) load(selected.id);
  }, [selected]);

  async function load(studentId: string) {
    setLoading(true);
    try {
      const [subjRes, enrollRes] = await Promise.all([
        api.get('/subjects'),
        api.get(`/enrollments?studentId=${studentId}`),
      ]);
      setSubjects(subjRes.data);
      setEnrollments(enrollRes.data);
    } catch {}
    setLoading(false);
  }

  async function toggle(subjectId: string) {
    if (!selected) return;
    const existing = enrollments.find((e) => e.subject.id === subjectId);
    setBusy((prev) => ({ ...prev, [subjectId]: true }));
    try {
      if (existing) {
        await api.delete(`/enrollments/${existing.id}`);
        setEnrollments((prev) => prev.filter((e) => e.id !== existing.id));
      } else {
        const res = await api.post('/enrollments', { studentId: selected.id, subjectId });
        setEnrollments((prev) => [...prev, res.data]);
      }
    } catch {
      Alert.alert('Erro', 'Não foi possível atualizar a matrícula');
    }
    setBusy((prev) => ({ ...prev, [subjectId]: false }));
  }

  if (!selected) {
    return (
      <ScrollView contentContainerStyle={s.content}>
        <Text style={s.hint}>Selecione o aluno para gerenciar as matrículas</Text>
        <StudentPicker onSelect={setSelected} />
      </ScrollView>
    );
  }

  return (
    <ScrollView contentContainerStyle={s.content}>
      <View style={s.studentHeader}>
        <View style={{ flex: 1 }}>
          <Text style={s.studentHeaderLabel}>Aluno selecionado</Text>
          <Text style={s.studentHeaderName}>{selected.name}</Text>
        </View>
        <TouchableOpacity onPress={() => setSelected(null)}>
          <Text style={s.changeLink}>Trocar</Text>
        </TouchableOpacity>
      </View>

      {loading
        ? [1, 2, 3].map((i) => <SkeletonCard key={i} height={48} />)
        : subjects.length === 0
          ? <EmptyState icon="📚" message="Nenhuma disciplina cadastrada" />
          : subjects.map((sub) => {
              const enrolled = enrollments.some((e) => e.subject.id === sub.id);
              return (
                <TouchableOpacity key={sub.id} onPress={() => toggle(sub.id)} disabled={busy[sub.id]}>
                  <Card style={{ marginBottom: 8 }}>
                    <View style={s.itemRow}>
                      <View style={[s.dot, { backgroundColor: sub.color }]} />
                      <Text style={s.itemName}>{sub.name}</Text>
                      <Text style={[s.checkMark, enrolled && s.checkMarkActive]}>
                        {busy[sub.id] ? '...' : enrolled ? '✓' : ''}
                      </Text>
                    </View>
                  </Card>
                </TouchableOpacity>
              );
            })
      }
    </ScrollView>
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
  input: { backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: colors.border, borderRadius: 8, padding: 10, fontSize: 14, color: colors.text },
  colorRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 4 },
  colorDot: { width: 32, height: 32, borderRadius: 16, borderWidth: 2, borderColor: 'transparent' },
  colorDotActive: { borderColor: colors.text },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderRadius: 20, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 12, paddingVertical: 6, backgroundColor: '#F9FAFB' },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: 13, color: colors.text },
  chipActiveText: { color: '#fff', fontWeight: '600' },
  itemRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  dot: { width: 14, height: 14, borderRadius: 7 },
  itemName: { fontSize: 14, fontWeight: '600', color: colors.text, flex: 1 },
  del: { fontSize: 16 },
  hint: { fontSize: 13, color: colors.muted, marginBottom: 12 },
  studentHeader: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: colors.border },
  studentHeaderLabel: { fontSize: 11, color: colors.muted, textTransform: 'uppercase', letterSpacing: 0.5 },
  studentHeaderName: { fontSize: 15, fontWeight: '700', color: colors.text, marginTop: 2 },
  changeLink: { fontSize: 13, color: colors.primary, fontWeight: '600' },
  checkMark: { fontSize: 16, fontWeight: '700', color: colors.muted, width: 24, textAlign: 'center' },
  checkMarkActive: { color: colors.success },
});
