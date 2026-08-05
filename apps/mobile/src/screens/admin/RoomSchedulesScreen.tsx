import { useCallback, useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Alert, RefreshControl, Modal, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '../../../lib/api';
import { Card, Button, SkeletonCard, EmptyState, colors } from '../../../components/ui';

interface Subject  { id: string; name: string }
interface Teacher  { id: string; name: string }
interface SchedTeacher { id: string; teacher: Teacher }
interface Schedule {
  id: string;
  dayOfWeek: number;
  shift: 'manhã' | 'tarde' | 'noite';
  subject: Subject | null;
  teachers: SchedTeacher[];
}
interface Room { id: string; name: string; capacity: number }

const SHIFTS: Array<'manhã' | 'tarde' | 'noite'> = ['manhã', 'tarde', 'noite'];
const SHIFT_LABELS = { manhã: 'Manhã', tarde: 'Tarde', noite: 'Noite' };
const SHIFT_COLORS = { manhã: '#F59E0B', tarde: '#3B82F6', noite: '#6366F1' };
const DAY_LABELS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

export function RoomSchedulesScreen() {
  const [rooms, setRooms]       = useState<Room[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading]   = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // sala expandida
  const [expandedRoom, setExpandedRoom] = useState<string | null>(null);
  const [schedules, setSchedules]       = useState<Record<string, Schedule[]>>({});
  const [loadingSchedules, setLoadingSchedules] = useState<string | null>(null);

  // modal de adicionar slot
  const [modal, setModal] = useState(false);
  const [modalRoom, setModalRoom] = useState<Room | null>(null);
  const [selDay, setSelDay]       = useState(1);
  const [selShift, setSelShift]   = useState<'manhã' | 'tarde' | 'noite'>('manhã');
  const [selSubject, setSelSubject] = useState('');
  const [selTeachers, setSelTeachers] = useState<string[]>([]);
  const [filteredTeachers, setFilteredTeachers] = useState<Teacher[]>([]);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const [roomsRes, subjectsRes, teachersRes] = await Promise.all([
        api.get<Room[]>('/rooms'),
        api.get<Subject[]>('/subjects'),
        api.get<Teacher[]>('/auth/users?role=teacher'),
      ]);
      setRooms(roomsRes.data);
      setSubjects(subjectsRes.data);
      setTeachers(teachersRes.data);
    } catch {}
  }, []);

  useEffect(() => { load().finally(() => setLoading(false)); }, [load]);

  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  async function toggleRoom(roomId: string) {
    if (expandedRoom === roomId) { setExpandedRoom(null); return; }
    setExpandedRoom(roomId);
    if (schedules[roomId]) return;
    setLoadingSchedules(roomId);
    try {
      const { data } = await api.get<Schedule[]>(`/rooms/${roomId}/schedules`);
      setSchedules((prev) => ({ ...prev, [roomId]: data }));
    } catch {}
    setLoadingSchedules(null);
  }

  async function loadSubjectTeachers(subjectId: string) {
    if (!subjectId) { setFilteredTeachers(teachers); return; }
    try {
      const { data } = await api.get<{ id: string; teacher: Teacher }[]>(`/teacher-subjects?subjectId=${subjectId}`);
      setFilteredTeachers(data.map((ts) => ts.teacher));
    } catch { setFilteredTeachers(teachers); }
  }

  function openAddModal(room: Room) {
    setModalRoom(room);
    setSelDay(1);
    setSelShift('manhã');
    setSelSubject('');
    setSelTeachers([]);
    setFilteredTeachers(teachers);
    setModal(true);
  }

  async function saveSlot() {
    if (!modalRoom) return;
    setSaving(true);
    try {
      await api.post(`/rooms/${modalRoom.id}/schedules`, {
        dayOfWeek: selDay,
        shift: selShift,
        subjectId: selSubject || undefined,
        teacherIds: selTeachers,
      });
      const { data } = await api.get<Schedule[]>(`/rooms/${modalRoom.id}/schedules`);
      setSchedules((prev) => ({ ...prev, [modalRoom.id]: data }));
      setModal(false);
    } catch { Alert.alert('Erro', 'Não foi possível salvar o horário'); }
    setSaving(false);
  }

  async function deleteSlot(roomId: string, scheduleId: string) {
    Alert.alert('Remover horário', 'Deseja remover este slot da grade?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Remover', style: 'destructive', onPress: async () => {
          try {
            await api.delete(`/rooms/${roomId}/schedules/${scheduleId}`);
            setSchedules((prev) => ({
              ...prev,
              [roomId]: (prev[roomId] ?? []).filter((s) => s.id !== scheduleId),
            }));
          } catch { Alert.alert('Erro', 'Não foi possível remover'); }
        },
      },
    ]);
  }

  function toggleTeacher(id: string) {
    setSelTeachers((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]
    );
  }

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.header}>
        <Text style={s.title}>Grade de Horários</Text>
      </View>

      <ScrollView
        contentContainerStyle={s.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {loading
          ? [1, 2, 3].map((i) => <SkeletonCard key={i} height={80} />)
          : rooms.length === 0
            ? <EmptyState icon="🏫" message="Nenhuma sala cadastrada" />
            : rooms.map((room) => {
                const isExpanded = expandedRoom === room.id;
                const roomSchedules = schedules[room.id] ?? [];
                const isLoadingThis = loadingSchedules === room.id;

                return (
                  <Card key={room.id} style={{ marginBottom: 10 }}>
                    {/* Cabeçalho da sala */}
                    <TouchableOpacity style={s.roomRow} onPress={() => toggleRoom(room.id)}>
                      <View style={{ flex: 1 }}>
                        <Text style={s.roomName}>{room.name}</Text>
                        <Text style={s.roomSub}>Capacidade: {room.capacity}</Text>
                      </View>
                      <Text style={s.chevron}>{isExpanded ? '▲' : '▼'}</Text>
                    </TouchableOpacity>

                    {isExpanded && (
                      <View style={{ marginTop: 12 }}>
                        {isLoadingThis ? (
                          <ActivityIndicator color={colors.primary} style={{ marginVertical: 12 }} />
                        ) : roomSchedules.length === 0 ? (
                          <Text style={s.empty}>Nenhum horário configurado</Text>
                        ) : (
                          roomSchedules.map((slot) => (
                            <View key={slot.id} style={s.slotRow}>
                              <View style={[s.shiftBadge, { backgroundColor: SHIFT_COLORS[slot.shift] + '22' }]}>
                                <Text style={[s.shiftText, { color: SHIFT_COLORS[slot.shift] }]}>
                                  {SHIFT_LABELS[slot.shift]}
                                </Text>
                              </View>
                              <View style={{ flex: 1 }}>
                                <Text style={s.slotDay}>{DAY_LABELS[slot.dayOfWeek]}</Text>
                                {slot.subject && <Text style={s.slotSubject}>{slot.subject.name}</Text>}
                                {slot.teachers.length > 0 && (
                                  <Text style={s.slotTeachers}>
                                    {slot.teachers.map((t) => t.teacher.name.split(' ')[0]).join(', ')}
                                  </Text>
                                )}
                              </View>
                              <TouchableOpacity onPress={() => deleteSlot(room.id, slot.id)}>
                                <Text style={s.deleteBtn}>✕</Text>
                              </TouchableOpacity>
                            </View>
                          ))
                        )}
                        <Button
                          label="+ Adicionar horário"
                          onPress={() => openAddModal(room)}
                          style={{ marginTop: 8 }}
                        />
                      </View>
                    )}
                  </Card>
                );
              })}
      </ScrollView>

      {/* Modal de adicionar slot */}
      <Modal visible={modal} animationType="slide" transparent onRequestClose={() => setModal(false)}>
        <View style={s.overlay}>
          <View style={s.sheet}>
            <View style={s.sheetHeader}>
              <Text style={s.sheetTitle}>Novo horário — {modalRoom?.name}</Text>
              <TouchableOpacity onPress={() => setModal(false)}>
                <Text style={s.closeBtn}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Dia */}
              <Text style={s.label}>Dia da semana</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                {DAY_LABELS.map((d, i) => (
                  <TouchableOpacity
                    key={i}
                    onPress={() => setSelDay(i)}
                    style={[s.chip, selDay === i && s.chipActive]}
                  >
                    <Text style={[s.chipText, selDay === i && s.chipTextActive]}>{d}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* Turno */}
              <Text style={s.label}>Turno</Text>
              <View style={s.row}>
                {SHIFTS.map((sh) => (
                  <TouchableOpacity
                    key={sh}
                    onPress={() => setSelShift(sh)}
                    style={[s.chip, selShift === sh && s.chipActive, { marginRight: 8 }]}
                  >
                    <Text style={[s.chipText, selShift === sh && s.chipTextActive]}>
                      {SHIFT_LABELS[sh]}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Disciplina */}
              <Text style={s.label}>Disciplina (opcional)</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                <TouchableOpacity
                  onPress={() => { setSelSubject(''); loadSubjectTeachers(''); setSelTeachers([]); }}
                  style={[s.chip, !selSubject && s.chipActive]}
                >
                  <Text style={[s.chipText, !selSubject && s.chipTextActive]}>Nenhuma</Text>
                </TouchableOpacity>
                {subjects.map((sub) => (
                  <TouchableOpacity
                    key={sub.id}
                    onPress={() => { setSelSubject(sub.id); loadSubjectTeachers(sub.id); setSelTeachers([]); }}
                    style={[s.chip, selSubject === sub.id && s.chipActive]}
                  >
                    <Text style={[s.chipText, selSubject === sub.id && s.chipTextActive]}>{sub.name}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* Professores */}
              <Text style={s.label}>
                Professores{selSubject && filteredTeachers.length === 0 ? ' (nenhum vinculado)' : ''}
              </Text>
              <View style={s.row}>
                {filteredTeachers.map((t) => {
                  const selected = selTeachers.includes(t.id);
                  return (
                    <TouchableOpacity
                      key={t.id}
                      onPress={() => toggleTeacher(t.id)}
                      style={[s.chip, selected && s.chipActive, { marginRight: 8, marginBottom: 8 }]}
                    >
                      <Text style={[s.chipText, selected && s.chipTextActive]}>{t.name.split(' ')[0]}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Button
                label={saving ? 'Salvando...' : 'Salvar horário'}
                onPress={saveSlot}
                loading={saving}
                style={{ marginTop: 16 }}
              />
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:        { flex: 1, backgroundColor: '#F8FAFC' },
  header:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 },
  title:       { fontSize: 22, fontWeight: '700', color: '#111827' },
  content:     { padding: 16, paddingBottom: 32 },
  roomRow:     { flexDirection: 'row', alignItems: 'center' },
  roomName:    { fontSize: 15, fontWeight: '600', color: '#111827' },
  roomSub:     { fontSize: 12, color: '#9CA3AF', marginTop: 2 },
  chevron:     { fontSize: 12, color: '#6B7280', marginLeft: 8 },
  empty:       { fontSize: 13, color: '#9CA3AF', textAlign: 'center', paddingVertical: 8 },
  slotRow:     { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingVertical: 6, borderTopWidth: 1, borderTopColor: '#F3F4F6' },
  shiftBadge:  { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4, alignSelf: 'flex-start' },
  shiftText:   { fontSize: 11, fontWeight: '700' },
  slotDay:     { fontSize: 13, fontWeight: '600', color: '#374151' },
  slotSubject: { fontSize: 12, color: '#2563EB', marginTop: 1 },
  slotTeachers:{ fontSize: 11, color: '#6B7280', marginTop: 1 },
  deleteBtn:   { fontSize: 16, color: '#EF4444', paddingHorizontal: 4 },
  label:       { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6 },
  row:         { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 12 },
  chip:        { borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6, marginRight: 6, marginBottom: 4 },
  chipActive:  { backgroundColor: '#2563EB', borderColor: '#2563EB' },
  chipText:    { fontSize: 13, color: '#374151' },
  chipTextActive: { color: '#fff', fontWeight: '600' },
  overlay:     { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet:       { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '85%' },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  sheetTitle:  { fontSize: 16, fontWeight: '700', color: '#111827', flex: 1 },
  closeBtn:    { fontSize: 18, color: '#9CA3AF', paddingLeft: 8 },
});
