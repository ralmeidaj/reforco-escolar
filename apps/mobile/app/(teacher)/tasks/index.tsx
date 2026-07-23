import { useEffect, useState } from 'react';
import { View, Text, ScrollView, TextInput, TouchableOpacity, StyleSheet, SafeAreaView, Alert } from 'react-native';
import { api } from '../../../lib/api';
import { Card, Badge, Button, SkeletonCard, EmptyState, SectionHeader, colors } from '../../../components/ui';

interface Student { id: string; name: string; }
interface Task { id: string; title: string; description: string | null; type: string; dueDate: string | null; status: string; student?: { name: string }; }

const TYPES = ['padrao', 'trabalho', 'eureka', 'trilha'] as const;
const TYPE_LABELS: Record<string, string> = { padrao: 'Padrão', trabalho: 'Trabalho', eureka: 'Eureka', trilha: 'Trilha' };

export default function TeacherTasks() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);

  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [type, setType] = useState<string>('padrao');
  const [dueDate, setDueDate] = useState('');
  const [studentId, setStudentId] = useState('');

  useEffect(() => {
    Promise.all([
      api.get('/tasks?limit=50'),
      api.get('/users?role=student&limit=100'),
    ]).then(([tasksRes, studRes]) => {
      setTasks(tasksRes.data);
      setStudents(studRes.data);
    }).finally(() => setLoading(false));
  }, []);

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

          <Text style={s.label}>Prazo (AAAA-MM-DD)</Text>
          <TextInput style={s.input} value={dueDate} onChangeText={setDueDate} placeholder="2025-12-31" keyboardType="numbers-and-punctuation" />

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
        <TouchableOpacity onPress={() => setCreating(true)} style={s.addBtn}>
          <Text style={s.addBtnText}>+ Nova</Text>
        </TouchableOpacity>
      </View>
      <ScrollView contentContainerStyle={s.content}>
        {loading
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
        }
      </ScrollView>
    </SafeAreaView>
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
