import { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, SafeAreaView, Alert } from 'react-native';
import { api } from '../../../lib/api';
import { Card, SkeletonCard, EmptyState, colors } from '../../../components/ui';

interface Session { id: string; scheduledAt: string; subject?: { name: string }; status: string; }
interface Student { id: string; name: string; }
interface AttendanceRecord { studentId: string; status: string; }

type AttStatus = 'presente' | 'ausente' | 'justificado';

const STATUS_STYLE: Record<AttStatus, { bg: string; text: string }> = {
  presente:    { bg: '#DCFCE7', text: '#15803D' },
  ausente:     { bg: '#FEE2E2', text: '#B91C1C' },
  justificado: { bg: '#FEF3C7', text: '#92400E' },
};

export default function TeacherAttendance() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [selected, setSelected] = useState<Session | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [attendance, setAttendance] = useState<Record<string, AttStatus>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get('/sessions?status=confirmada&limit=10').then((r) => setSessions(r.data)).finally(() => setLoading(false));
  }, []);

  async function openSession(session: Session) {
    setSelected(session);
    const [studRes, attRes] = await Promise.all([
      api.get(`/sessions/${session.id}/students`),
      api.get(`/attendance?sessionId=${session.id}`),
    ]);
    setStudents(studRes.data);
    const map: Record<string, AttStatus> = {};
    for (const a of attRes.data as AttendanceRecord[]) {
      map[a.studentId] = a.status as AttStatus;
    }
    setAttendance(map);
  }

  function toggle(studentId: string) {
    setAttendance((prev) => {
      const cur = prev[studentId] ?? 'presente';
      const next: AttStatus = cur === 'presente' ? 'ausente' : cur === 'ausente' ? 'justificado' : 'presente';
      return { ...prev, [studentId]: next };
    });
  }

  async function saveAll() {
    if (!selected) return;
    setSaving(true);
    try {
      await Promise.all(
        students.map((st) =>
          api.post('/attendance', {
            sessionId: selected.id,
            studentId: st.id,
            status: attendance[st.id] ?? 'presente',
          }),
        ),
      );
      Alert.alert('Salvo', 'Presença registrada com sucesso!');
      setSelected(null);
    } catch {
      Alert.alert('Erro', 'Falha ao salvar presença');
    }
    setSaving(false);
  }

  if (selected) {
    return (
      <SafeAreaView style={s.safe}>
        <View style={s.header}>
          <TouchableOpacity onPress={() => setSelected(null)}><Text style={s.back}>← Voltar</Text></TouchableOpacity>
          <Text style={s.headerTitle} numberOfLines={1}>{selected.subject?.name}</Text>
        </View>
        <ScrollView contentContainerStyle={s.content}>
          <Text style={s.sessionDate}>
            {new Date(selected.scheduledAt).toLocaleString('pt-BR', { dateStyle: 'full', timeStyle: 'short' })}
          </Text>
          {students.map((st) => {
            const status = attendance[st.id] ?? 'presente';
            const style = STATUS_STYLE[status];
            return (
              <TouchableOpacity key={st.id} onPress={() => toggle(st.id)} activeOpacity={0.8}>
                <Card style={{ marginBottom: 8 }}>
                  <View style={row.between}>
                    <Text style={s.studentName}>{st.name}</Text>
                    <View style={[s.statusPill, { backgroundColor: style.bg }]}>
                      <Text style={[s.statusText, { color: style.text }]}>
                        {status === 'presente' ? '✓ Presente' : status === 'ausente' ? '✗ Ausente' : '~ Justificado'}
                      </Text>
                    </View>
                  </View>
                </Card>
              </TouchableOpacity>
            );
          })}
          <TouchableOpacity
            onPress={saveAll}
            disabled={saving}
            style={[s.saveBtn, saving && { opacity: 0.6 }]}
          >
            <Text style={s.saveBtnText}>{saving ? 'Salvando...' : 'Salvar presença'}</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.header}><Text style={s.headerTitle}>Lista de Presença</Text></View>
      <ScrollView contentContainerStyle={s.content}>
        <Text style={s.hint}>Toque em uma sessão para registrar presença</Text>
        {loading
          ? [1, 2, 3].map((i) => <SkeletonCard key={i} height={72} />)
          : sessions.length === 0
            ? <EmptyState icon="📅" message="Nenhuma sessão confirmada hoje" />
            : sessions.map((sess) => (
                <TouchableOpacity key={sess.id} onPress={() => openSession(sess)}>
                  <Card>
                    <Text style={s.sessSubject}>{sess.subject?.name ?? 'Aula'}</Text>
                    <Text style={s.sessDate}>
                      {new Date(sess.scheduledAt).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
                    </Text>
                  </Card>
                </TouchableOpacity>
              ))
        }
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: 'row', alignItems: 'center', padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderColor: colors.border, gap: 12 },
  back: { fontSize: 14, color: colors.primary, fontWeight: '600' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: colors.text, flex: 1 },
  content: { padding: 16, paddingBottom: 40 },
  hint: { fontSize: 13, color: colors.muted, marginBottom: 12 },
  sessionDate: { fontSize: 13, color: colors.muted, marginBottom: 16, fontStyle: 'italic' },
  studentName: { fontSize: 15, fontWeight: '600', color: colors.text },
  statusPill: { borderRadius: 99, paddingHorizontal: 10, paddingVertical: 4 },
  statusText: { fontSize: 13, fontWeight: '600' },
  saveBtn: { backgroundColor: colors.primary, borderRadius: 10, padding: 14, alignItems: 'center', marginTop: 16 },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  sessSubject: { fontSize: 15, fontWeight: '700', color: colors.text },
  sessDate: { fontSize: 12, color: colors.muted, marginTop: 2 },
});
const row = StyleSheet.create({ between: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' } });
