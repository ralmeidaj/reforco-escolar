import { useCallback, useEffect, useState } from 'react';
import { View, Text, ScrollView, TextInput, TouchableOpacity, StyleSheet, SafeAreaView, Alert, RefreshControl } from 'react-native';
import { api } from '../../../lib/api';
import { Card, Button, SkeletonCard, EmptyState, colors } from '../../../components/ui';

interface Assignment {
  id: string;
  teacher: { id: string; name: string };
  subject: { id: string; name: string } | null;
}

interface Room {
  id: string;
  name: string;
  capacity: number;
  currentCount?: number;
  assignments: Assignment[];
}
interface Teacher { id: string; name: string }
interface Subject { id: string; name: string }

export function RoomsScreen() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [capacity, setCapacity] = useState('');
  const [teacherIdx, setTeacherIdx] = useState(-1);
  const [subjectIdx, setSubjectIdx] = useState(-1);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const [occRes, teachersRes, subjectsRes] = await Promise.all([
        api.get('/rooms/occupancy').catch(() => ({ data: [] })),
        api.get('/auth/users?role=teacher'),
        api.get('/subjects'),
      ]);
      setRooms(occRes.data.map((r: Room) => ({ ...r, currentCount: r.currentCount ?? 0 })));
      setTeachers(teachersRes.data);
      setSubjects(subjectsRes.data);
    } catch {}
  }, []);

  useEffect(() => { load().finally(() => setLoading(false)); }, [load]);

  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  async function create() {
    if (!name.trim() || !capacity) { Alert.alert('Preencha nome e capacidade'); return; }
    setSaving(true);
    try {
      await api.post('/rooms', { name: name.trim(), capacity: Number(capacity) });
      await load();
      setCreating(false); setName(''); setCapacity(''); setTeacherIdx(-1); setSubjectIdx(-1);
    } catch { Alert.alert('Erro', 'Não foi possível criar a sala'); }
    setSaving(false);
  }

  async function addAssignment(roomId: string) {
    if (teacherIdx < 0) { Alert.alert('Selecione um professor'); return; }
    const payload: any = { teacherId: teachers[teacherIdx].id };
    if (subjectIdx >= 0) payload.subjectId = subjects[subjectIdx].id;
    try {
      await api.post(`/rooms/${roomId}/assignments`, payload);
      await load();
      setTeacherIdx(-1); setSubjectIdx(-1);
    } catch { Alert.alert('Erro', 'Não foi possível adicionar professor'); }
  }

  async function removeAssignment(roomId: string, assignmentId: string) {
    Alert.alert('Remover professor', 'Deseja remover este professor da sala?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Remover', style: 'destructive', onPress: async () => {
          await api.delete(`/rooms/${roomId}/assignments/${assignmentId}`);
          await load();
        },
      },
    ]);
  }

  async function remove(id: string) {
    Alert.alert('Excluir sala', 'Deseja excluir esta sala?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Excluir', style: 'destructive', onPress: async () => {
          await api.delete(`/rooms/${id}`);
          setRooms((prev) => prev.filter((r) => r.id !== id));
        },
      },
    ]);
  }

  function barColor(cur: number, cap: number) {
    const p = cap ? cur / cap : 0;
    if (p >= 1) return colors.danger;
    if (p >= 0.75) return colors.warning;
    return colors.success;
  }

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.header}>
        <Text style={s.title}>Salas</Text>
        <TouchableOpacity onPress={() => setCreating(!creating)} style={s.addBtn}>
          <Text style={s.addBtnText}>{creating ? '✕ Cancelar' : '+ Nova sala'}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={s.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
        {creating && (
          <Card style={{ marginBottom: 16 }}>
            <Text style={s.formTitle}>Nova sala</Text>
            <Text style={s.label}>Nome</Text>
            <TextInput style={s.input} value={name} onChangeText={setName} placeholder="Ex: Sala A" />
            <Text style={s.label}>Capacidade</Text>
            <TextInput style={s.input} value={capacity} onChangeText={setCapacity} placeholder="Ex: 6" keyboardType="number-pad" />
            <Button label={saving ? 'Criando...' : 'Criar sala'} onPress={create} loading={saving} style={{ marginTop: 12 }} />
          </Card>
        )}

        {loading
          ? [1, 2, 3].map((i) => <SkeletonCard key={i} height={100} />)
          : rooms.length === 0
            ? <EmptyState icon="🏫" message="Nenhuma sala cadastrada" />
            : rooms.map((room) => {
                const cur = room.currentCount ?? 0;
                const cap = room.capacity;
                const p = cap ? Math.min(100, Math.round((cur / cap) * 100)) : 0;
                const color = barColor(cur, cap);
                return (
                  <Card key={room.id} style={{ marginBottom: 10 }}>
                    <View style={s.roomRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={s.roomName}>{room.name}</Text>
                        <Text style={s.roomCap}>Capacidade: {cap}</Text>
                      </View>
                      <View style={{ alignItems: 'flex-end', gap: 6 }}>
                        <Text style={[s.occ, { color }]}>{cur}/{cap}</Text>
                        <TouchableOpacity onPress={() => remove(room.id)}>
                          <Text style={s.del}>🗑</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                    <View style={s.barBg}>
                      <View style={[s.barFill, { width: `${p}%` as any, backgroundColor: color }]} />
                    </View>
                    <Text style={s.pct}>{p}% ocupado</Text>

                    {/* Assignments */}
                    <View style={s.assignRow}>
                      {room.assignments?.map((a) => (
                        <TouchableOpacity key={a.id} onPress={() => removeAssignment(room.id, a.id)} style={s.assignChip}>
                          <Text style={s.assignChipText}>
                            {[a.subject?.name, `Prof. ${a.teacher.name}`].filter(Boolean).join(' · ')} ×
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>

                    {/* Add professor inline */}
                    <View style={s.addAssignRow}>
                      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                        <View style={s.chips}>
                          <TouchableOpacity onPress={() => setTeacherIdx(-1)} style={[s.chip, teacherIdx === -1 && s.chipActive]}>
                            <Text style={[s.chipText, teacherIdx === -1 && s.chipActiveText]}>Prof.</Text>
                          </TouchableOpacity>
                          {teachers.map((t, i) => (
                            <TouchableOpacity key={t.id} onPress={() => setTeacherIdx(i)} style={[s.chip, teacherIdx === i && s.chipActive]}>
                              <Text style={[s.chipText, teacherIdx === i && s.chipActiveText]}>{t.name}</Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      </ScrollView>
                      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                        <View style={s.chips}>
                          <TouchableOpacity onPress={() => setSubjectIdx(-1)} style={[s.chip, subjectIdx === -1 && s.chipActive]}>
                            <Text style={[s.chipText, subjectIdx === -1 && s.chipActiveText]}>Disc.</Text>
                          </TouchableOpacity>
                          {subjects.map((sub, i) => (
                            <TouchableOpacity key={sub.id} onPress={() => setSubjectIdx(i)} style={[s.chip, subjectIdx === i && s.chipActive]}>
                              <Text style={[s.chipText, subjectIdx === i && s.chipActiveText]}>{sub.name}</Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      </ScrollView>
                      {teacherIdx >= 0 && (
                        <TouchableOpacity onPress={() => addAssignment(room.id)} style={s.addBtn}>
                          <Text style={s.addBtnText}>+ Adicionar</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </Card>
                );
              })
        }
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderColor: colors.border },
  title: { fontSize: 20, fontWeight: '700', color: colors.text },
  addBtn: { backgroundColor: colors.primary, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 },
  addBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  content: { padding: 16, paddingBottom: 40 },
  formTitle: { fontSize: 15, fontWeight: '700', color: colors.text, marginBottom: 10 },
  label: { fontSize: 12, color: colors.muted, fontWeight: '600', marginBottom: 4, marginTop: 8 },
  input: { backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: colors.border, borderRadius: 8, padding: 10, fontSize: 14, color: colors.text },
  chips: { flexDirection: 'row', gap: 8, paddingVertical: 4 },
  chip: { borderRadius: 20, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 12, paddingVertical: 6, backgroundColor: '#F9FAFB' },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: 13, color: colors.text },
  chipActiveText: { color: '#fff', fontWeight: '600' },
  roomRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  roomName: { fontSize: 16, fontWeight: '700', color: colors.text },
  roomMeta: { fontSize: 12, color: colors.primary, marginTop: 2 },
  roomMetaEmpty: { fontSize: 12, color: colors.muted, marginTop: 2, fontStyle: 'italic' },
  roomCap: { fontSize: 12, color: colors.muted, marginTop: 2 },
  assignRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  assignChip: { backgroundColor: '#EFF6FF', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderColor: '#BFDBFE' },
  assignChipText: { fontSize: 11, color: colors.primary, fontWeight: '500' },
  addAssignRow: { marginTop: 8, gap: 4 },
  occ: { fontSize: 18, fontWeight: '800' },
  del: { fontSize: 16 },
  barBg: { height: 8, backgroundColor: '#E5E7EB', borderRadius: 4, overflow: 'hidden', marginTop: 10 },
  barFill: { height: 8, borderRadius: 4 },
  pct: { fontSize: 11, color: colors.muted, marginTop: 4 },
});
