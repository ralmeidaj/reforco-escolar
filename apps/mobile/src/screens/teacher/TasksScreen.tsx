import { useCallback, useEffect, useState } from 'react';
import { View, Text, ScrollView, TextInput, TouchableOpacity, StyleSheet, Alert, Modal, Image, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '../../../lib/api';
import { Card, Badge, Button, SkeletonCard, EmptyState, SectionHeader, colors } from '../../../components/ui';

interface Student { id: string; name: string; }
interface Task { id: string; title: string; description: string | null; type: string; dueDate: string | null; status: string; student?: { name: string }; }
interface Capture {
  id: string;
  subject: string | null;
  title: string;
  description: string | null;
  dueDate: string | null;
  imageUrl: string;
  student?: { name: string };
}

const TYPES = ['padrao', 'trabalho', 'eureka', 'trilha'] as const;
const TYPE_LABELS: Record<string, string> = { padrao: 'Padrão', trabalho: 'Trabalho', eureka: 'Eureka', trilha: 'Trilha' };

function DatePickerInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [show, setShow] = useState(false);
  const [day, setDay] = useState('');
  const [month, setMonth] = useState('');
  const [year, setYear] = useState('');

  function confirm() {
    const d = day.padStart(2, '0');
    const m = month.padStart(2, '0');
    const y = year || String(new Date().getFullYear());
    if (d && m && y.length === 4) onChange(`${y}-${m}-${d}`);
    setShow(false);
  }

  function clear() {
    setDay(''); setMonth(''); setYear('');
    onChange('');
    setShow(false);
  }

  const displayDate = value
    ? new Date(value + 'T12:00:00').toLocaleDateString('pt-BR')
    : null;

  return (
    <>
      <TouchableOpacity onPress={() => setShow(true)} style={dp.btn}>
        <Text style={displayDate ? dp.val : dp.placeholder}>
          {displayDate ?? 'Selecionar data (opcional)'}
        </Text>
      </TouchableOpacity>
      <Modal visible={show} transparent animationType="fade">
        <View style={dp.overlay}>
          <View style={dp.box}>
            <Text style={dp.title}>Prazo da tarefa</Text>
            <View style={dp.row}>
              <TextInput style={dp.input} placeholder="DD"   value={day}   onChangeText={setDay}   keyboardType="number-pad" maxLength={2} />
              <Text style={dp.sep}>/</Text>
              <TextInput style={dp.input} placeholder="MM"   value={month} onChangeText={setMonth} keyboardType="number-pad" maxLength={2} />
              <Text style={dp.sep}>/</Text>
              <TextInput style={[dp.input, { width: 64 }]} placeholder="AAAA" value={year} onChangeText={setYear} keyboardType="number-pad" maxLength={4} />
            </View>
            <View style={dp.btns}>
              <Button label="Sem prazo" variant="ghost" onPress={clear} style={{ flex: 1 }} />
              <Button label="OK" onPress={confirm} style={{ flex: 1 }} />
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

export function TasksScreen() {
  const [section, setSection] = useState<'minhas' | 'capturas'>('minhas');

  const [tasks, setTasks] = useState<Task[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);

  const [captures, setCaptures] = useState<Capture[]>([]);
  const [loadingCaptures, setLoadingCaptures] = useState(true);

  useEffect(() => { if (section === 'capturas') loadCaptures(); }, [section]);

  const loadCaptures = useCallback(async () => {
    setLoadingCaptures(true);
    try {
      const res = await api.get('/tasks/school-captures');
      setCaptures(res.data);
    } catch {}
    setLoadingCaptures(false);
  }, []);

  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [type, setType] = useState<string>('padrao');
  const [dueDate, setDueDate] = useState('');
  const [studentId, setStudentId] = useState('');

  const load = useCallback(async () => {
    try {
      const [tasksRes, sessRes] = await Promise.all([
        api.get('/tasks/teacher'),
        api.get('/sessions'),
      ]);
      setTasks(tasksRes.data);
      const map = new Map<string, Student>();
      for (const s of sessRes.data) {
        if (s.student && !map.has(s.student.id)) map.set(s.student.id, s.student);
      }
      setStudents(Array.from(map.values()));
    } catch {}
  }, []);

  useEffect(() => { load().finally(() => setLoading(false)); }, [load]);

  const onRefresh = async () => {
    setRefreshing(true);
    if (section === 'minhas') await load(); else await loadCaptures();
    setRefreshing(false);
  };

  async function create() {
    if (!title.trim() || !studentId) {
      Alert.alert('Campos obrigatórios', 'Preencha o título e selecione um aluno');
      return;
    }
    setSaving(true);
    try {
      const res = await api.post('/tasks', {
        title: title.trim(),
        description: desc.trim() || undefined,
        type,
        dueDate: dueDate || undefined,
        studentId,
      });
      setTasks((prev) => [res.data, ...prev]);
      setCreating(false);
      setTitle(''); setDesc(''); setType('padrao'); setDueDate(''); setStudentId('');
    } catch {
      Alert.alert('Erro', 'Não foi possível criar a tarefa');
    }
    setSaving(false);
  }

  async function remove(id: string) {
    Alert.alert('Excluir tarefa', 'Deseja excluir esta tarefa?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Excluir', style: 'destructive', onPress: async () => {
          await api.delete(`/tasks/${id}`);
          setTasks((prev) => prev.filter((t) => t.id !== id));
        },
      },
    ]);
  }

  const pending = tasks.filter((t) => t.status === 'pendente');
  const done = tasks.filter((t) => t.status === 'feita');

  if (creating) {
    return (
      <SafeAreaView style={s.safe}>
        <View style={s.header}>
          <TouchableOpacity onPress={() => setCreating(false)}><Text style={s.back}>← Voltar</Text></TouchableOpacity>
          <Text style={s.headerTitle}>Nova Tarefa</Text>
        </View>
        <ScrollView contentContainerStyle={s.content}>
          <Text style={s.label}>Título *</Text>
          <TextInput style={s.input} value={title} onChangeText={setTitle} placeholder="Ex: Exercícios de fração" />

          <Text style={s.label}>Descrição</Text>
          <TextInput style={[s.input, s.textarea]} value={desc} onChangeText={setDesc} placeholder="Detalhes da tarefa..." multiline numberOfLines={3} />

          <Text style={s.label}>Tipo</Text>
          <View style={s.typeRow}>
            {TYPES.map((t) => (
              <TouchableOpacity key={t} onPress={() => setType(t)} style={[s.typeChip, type === t && s.typeChipActive]}>
                <Text style={[s.typeChipText, type === t && s.typeChipTextActive]}>{TYPE_LABELS[t]}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={s.label}>Prazo</Text>
          <DatePickerInput value={dueDate} onChange={setDueDate} />

          <Text style={s.label}>Aluno *</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
            {students.map((st) => (
              <TouchableOpacity key={st.id} onPress={() => setStudentId(st.id)} style={[s.studentChip, studentId === st.id && s.studentChipActive]}>
                <Text style={[s.studentChipText, studentId === st.id && s.studentChipTextActive]}>{st.name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <Button label={saving ? 'Criando...' : 'Criar tarefa'} onPress={create} loading={saving} />
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.header}>
        <Text style={s.headerTitle}>Tarefas</Text>
        {section === 'minhas' && (
          <TouchableOpacity onPress={() => setCreating(true)} style={s.addBtn}>
            <Text style={s.addBtnText}>+ Nova</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={s.segmentRow}>
        {(['minhas', 'capturas'] as const).map((sec) => (
          <TouchableOpacity key={sec} onPress={() => setSection(sec)} style={[s.segment, section === sec && s.segmentActive]}>
            <Text style={[s.segmentText, section === sec && s.segmentTextActive]}>
              {sec === 'minhas' ? 'Minhas tarefas' : 'Capturas dos alunos'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        contentContainerStyle={s.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {section === 'minhas' ? (
          loading
            ? [1, 2, 3].map((i) => <SkeletonCard key={i} />)
            : <>
                <SectionHeader title={`Pendentes (${pending.length})`} />
                {pending.length === 0
                  ? <EmptyState icon="✅" message="Nenhuma tarefa pendente" />
                  : pending.map((t) => <TaskItem key={t.id} task={t} onDelete={remove} />)
                }
                {done.length > 0 && (
                  <>
                    <SectionHeader title={`Concluídas (${done.length})`} />
                    {done.map((t) => <TaskItem key={t.id} task={t} onDelete={remove} />)}
                  </>
                )}
              </>
        ) : (
          loadingCaptures
            ? [1, 2, 3].map((i) => <SkeletonCard key={i} />)
            : captures.length === 0
              ? <EmptyState icon="🏫" message="Nenhuma captura de tarefa da escola ainda" />
              : captures.map((c) => <CaptureItem key={c.id} capture={c} />)
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function CaptureItem({ capture }: { capture: Capture }) {
  return (
    <Card style={{ marginBottom: 8 }}>
      <View style={{ flexDirection: 'row' }}>
        <Image source={{ uri: capture.imageUrl }} style={s.thumb} />
        <View style={{ flex: 1 }}>
          {capture.student && <Text style={s.taskStudent}>{capture.student.name}</Text>}
          {capture.subject && <Text style={s.captureSubject}>{capture.subject}</Text>}
          <Text style={s.taskTitle}>{capture.title}</Text>
          {capture.description && <Text style={s.captureDesc}>{capture.description}</Text>}
          {capture.dueDate && (
            <Text style={s.taskDue}>Prazo: {new Date(capture.dueDate).toLocaleDateString('pt-BR')}</Text>
          )}
        </View>
      </View>
    </Card>
  );
}

function TaskItem({ task, onDelete }: { task: Task; onDelete: (id: string) => void }) {
  const overdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'feita';
  return (
    <Card style={{ marginBottom: 8 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <View style={{ flex: 1, marginRight: 8 }}>
          <Text style={[s.taskTitle, task.status === 'feita' && s.done]}>{task.title}</Text>
          {task.student && <Text style={s.taskStudent}>{task.student.name}</Text>}
          {task.dueDate && (
            <Text style={[s.taskDue, overdue ? s.overdue : {}]}>
              Prazo: {new Date(task.dueDate).toLocaleDateString('pt-BR')}
            </Text>
          )}
        </View>
        <View style={{ alignItems: 'flex-end', gap: 6 }}>
          <Badge label={TYPE_LABELS[task.type] ?? task.type} variant="default" />
          <TouchableOpacity onPress={() => onDelete(task.id)}>
            <Text style={s.deleteBtn}>🗑</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Card>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: 'row', alignItems: 'center', padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderColor: colors.border, gap: 12 },
  back: { fontSize: 14, color: colors.primary, fontWeight: '600' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: colors.text, flex: 1 },
  addBtn: { backgroundColor: colors.primary, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 },
  addBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  segmentRow: { flexDirection: 'row', backgroundColor: '#fff', padding: 8, gap: 8, borderBottomWidth: 1, borderColor: colors.border },
  segment: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 8, backgroundColor: '#F3F4F6' },
  segmentActive: { backgroundColor: colors.primary },
  segmentText: { fontSize: 13, fontWeight: '600', color: colors.muted },
  segmentTextActive: { color: '#fff' },
  thumb: { width: 48, height: 48, borderRadius: 8, marginRight: 10, backgroundColor: colors.border },
  captureSubject: { fontSize: 11, fontWeight: '700', color: colors.primary, textTransform: 'uppercase', marginTop: 2 },
  captureDesc: { fontSize: 13, color: colors.muted, marginTop: 2 },
  content: { padding: 16, paddingBottom: 40 },
  label: { fontSize: 13, fontWeight: '600', color: colors.muted, marginBottom: 6, marginTop: 12 },
  input: { backgroundColor: '#fff', borderWidth: 1, borderColor: colors.border, borderRadius: 8, padding: 10, fontSize: 14, color: colors.text },
  textarea: { minHeight: 72, textAlignVertical: 'top' },
  typeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  typeChip: { borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6, backgroundColor: '#F3F4F6', borderWidth: 1, borderColor: colors.border },
  typeChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  typeChipText: { fontSize: 13, color: colors.text },
  typeChipTextActive: { color: '#fff', fontWeight: '600' },
  studentChip: { borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6, backgroundColor: '#F3F4F6', borderWidth: 1, borderColor: colors.border, marginRight: 8 },
  studentChipActive: { backgroundColor: '#DBEAFE', borderColor: colors.primary },
  studentChipText: { fontSize: 13, color: colors.text },
  studentChipTextActive: { color: colors.primary, fontWeight: '600' },
  taskTitle: { fontSize: 14, fontWeight: '600', color: colors.text },
  taskStudent: { fontSize: 12, color: colors.muted, marginTop: 2 },
  taskDue: { fontSize: 12, color: colors.muted, marginTop: 2 },
  done: { textDecorationLine: 'line-through', color: colors.muted },
  overdue: { color: colors.danger, fontWeight: '600' },
  deleteBtn: { fontSize: 16 },
});

const dp = StyleSheet.create({
  btn: { backgroundColor: '#fff', borderWidth: 1, borderColor: colors.border, borderRadius: 8, padding: 10, marginTop: 0 },
  val: { fontSize: 14, color: colors.text },
  placeholder: { fontSize: 14, color: colors.muted },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  box: { backgroundColor: '#fff', borderRadius: 16, padding: 24, width: '100%' },
  title: { fontSize: 16, fontWeight: '700', color: colors.text, marginBottom: 20, textAlign: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, marginBottom: 24 },
  input: { width: 52, borderWidth: 1, borderColor: colors.border, borderRadius: 8, padding: 10, fontSize: 18, textAlign: 'center', color: colors.text },
  sep: { fontSize: 20, color: colors.muted },
  btns: { flexDirection: 'row', gap: 12 },
});
