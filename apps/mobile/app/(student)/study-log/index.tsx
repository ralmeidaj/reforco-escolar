import { useEffect, useState } from 'react';
import { View, Text, ScrollView, TextInput, TouchableOpacity, StyleSheet, SafeAreaView, Alert } from 'react-native';
import { api } from '../../../lib/api';
import { Card, Button, SkeletonCard, EmptyState, colors } from '../../../components/ui';

interface StudyLog {
  id: string;
  topic: string;
  pagesRead: number;
  studiedAt: string;
  subject?: { name: string };
}

interface Subject { id: string; name: string; }

export default function StudyLogScreen() {
  const [logs, setLogs] = useState<StudyLog[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ subjectId: '', topic: '', pagesRead: '' });
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    Promise.all([
      api.get('/study-logs').then((r) => setLogs(r.data)),
      api.get('/subjects').then((r) => setSubjects(r.data)),
    ]).finally(() => setLoading(false));
  }, []);

  async function save() {
    if (!form.subjectId || !form.topic.trim()) {
      Alert.alert('Atenção', 'Preencha a disciplina e o assunto');
      return;
    }
    setSaving(true);
    try {
      const res = await api.post('/study-logs', {
        subjectId: form.subjectId,
        topic: form.topic.trim(),
        pagesRead: parseInt(form.pagesRead) || 0,
        studiedAt: new Date().toISOString().split('T')[0],
      });
      setLogs((prev) => [res.data, ...prev]);
      setForm({ subjectId: '', topic: '', pagesRead: '' });
      setShowForm(false);
    } catch (e: any) {
      Alert.alert('Erro', e.response?.data?.message ?? 'Erro ao salvar');
    }
    setSaving(false);
  }

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.header}>
        <Text style={s.title}>Diário de Estudo</Text>
        <TouchableOpacity onPress={() => setShowForm(!showForm)} style={s.addBtn}>
          <Text style={s.addBtnText}>{showForm ? '✕' : '+ Registrar'}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={s.content}>
        {showForm && (
          <Card style={{ marginBottom: 16 }}>
            <Text style={s.formTitle}>Novo registro</Text>
            <Text style={s.label}>Disciplina</Text>
            <View style={s.picker}>
              {subjects.map((sub) => (
                <TouchableOpacity
                  key={sub.id}
                  onPress={() => setForm({ ...form, subjectId: sub.id })}
                  style={[s.chip, form.subjectId === sub.id && s.chipActive]}
                >
                  <Text style={[s.chipText, form.subjectId === sub.id && s.chipTextActive]}>{sub.name}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={s.label}>Assunto estudado</Text>
            <TextInput
              style={s.input}
              value={form.topic}
              onChangeText={(v) => setForm({ ...form, topic: v })}
              placeholder="Ex: Frações equivalentes"
            />
            <Text style={s.label}>Páginas lidas</Text>
            <TextInput
              style={s.input}
              value={form.pagesRead}
              onChangeText={(v) => setForm({ ...form, pagesRead: v })}
              keyboardType="numeric"
              placeholder="0"
            />
            <Button label={saving ? 'Salvando...' : 'Salvar'} onPress={save} loading={saving} style={{ marginTop: 8 }} />
          </Card>
        )}

        <Text style={s.sectionLabel}>Histórico</Text>
        {loading
          ? [1, 2, 3].map((i) => <SkeletonCard key={i} height={64} />)
          : logs.length === 0
            ? <EmptyState icon="📖" message="Nenhum registro ainda. Comece estudando!" />
            : logs.map((log) => (
                <Card key={log.id}>
                  <View style={row.row}>
                    <View style={{ flex: 1 }}>
                      <Text style={s.logTopic}>{log.topic}</Text>
                      <Text style={s.logSub}>
                        {log.subject?.name} · {new Date(log.studiedAt).toLocaleDateString('pt-BR')}
                      </Text>
                    </View>
                    {log.pagesRead > 0 && (
                      <View style={s.pagesBox}>
                        <Text style={s.pagesNum}>{log.pagesRead}</Text>
                        <Text style={s.pagesPgs}>págs</Text>
                      </View>
                    )}
                  </View>
                </Card>
              ))
        }
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderColor: colors.border },
  title: { fontSize: 18, fontWeight: '700', color: colors.text },
  addBtn: { backgroundColor: colors.primary, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 },
  addBtnText: { color: '#fff', fontWeight: '600', fontSize: 13 },
  content: { padding: 16, paddingBottom: 40 },
  formTitle: { fontSize: 15, fontWeight: '700', color: colors.text, marginBottom: 12 },
  label: { fontSize: 13, fontWeight: '500', color: colors.muted, marginBottom: 6, marginTop: 8 },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: colors.text, backgroundColor: '#fff' },
  picker: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderWidth: 1, borderColor: colors.border, borderRadius: 99, paddingHorizontal: 12, paddingVertical: 6 },
  chipActive: { borderColor: colors.primary, backgroundColor: '#DBEAFE' },
  chipText: { fontSize: 13, color: colors.muted },
  chipTextActive: { color: colors.primary, fontWeight: '600' },
  sectionLabel: { fontSize: 13, fontWeight: '700', color: colors.muted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  logTopic: { fontSize: 15, fontWeight: '600', color: colors.text },
  logSub: { fontSize: 12, color: colors.muted, marginTop: 2 },
  pagesBox: { alignItems: 'center', backgroundColor: '#EFF6FF', borderRadius: 8, padding: 8 },
  pagesNum: { fontSize: 18, fontWeight: '700', color: colors.primary },
  pagesPgs: { fontSize: 10, color: colors.muted },
});
const row = StyleSheet.create({ row: { flexDirection: 'row', alignItems: 'center' } });
