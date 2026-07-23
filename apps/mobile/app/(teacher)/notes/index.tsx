import { useEffect, useState } from 'react';
import { View, Text, ScrollView, TextInput, TouchableOpacity, StyleSheet, SafeAreaView, Alert } from 'react-native';
import { api } from '../../../lib/api';
import { Card, Button, SkeletonCard, EmptyState, colors } from '../../../components/ui';

interface Session { id: string; scheduledAt: string; subject?: { name: string }; }
interface Note { id: string; content: string; createdAt: string; }

export default function TeacherNotes() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [selected, setSelected] = useState<Session | null>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get('/sessions?status=realizada&limit=20').then((r) => setSessions(r.data)).finally(() => setLoading(false));
  }, []);

  async function openSession(sess: Session) {
    setSelected(sess);
    const res = await api.get(`/sessions/${sess.id}/notes`);
    setNotes(res.data);
  }

  async function save() {
    if (!content.trim() || !selected) return;
    setSaving(true);
    try {
      const res = await api.post(`/sessions/${selected.id}/notes`, { content: content.trim() });
      setNotes((prev) => [res.data, ...prev]);
      setContent('');
    } catch {
      Alert.alert('Erro', 'Não foi possível salvar a nota');
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
          <View style={s.inputBox}>
            <Text style={s.label}>Nova nota de aula</Text>
            <TextInput
              style={s.textarea}
              value={content}
              onChangeText={setContent}
              placeholder="Descreva o que foi trabalhado nesta aula..."
              multiline
              numberOfLines={5}
            />
            <Button label={saving ? 'Salvando...' : 'Salvar nota'} onPress={save} loading={saving} style={{ marginTop: 8 }} />
          </View>
          {notes.length > 0 && (
            <>
              <Text style={s.section}>Notas anteriores</Text>
              {notes.map((n) => (
                <Card key={n.id}>
                  <Text style={s.noteContent}>{n.content}</Text>
                  <Text style={s.noteDate}>{new Date(n.createdAt).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}</Text>
                </Card>
              ))}
            </>
          )}
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.header}><Text style={s.headerTitle}>Notas de Aula</Text></View>
      <ScrollView contentContainerStyle={s.content}>
        <Text style={s.hint}>Selecione uma aula realizada para adicionar notas</Text>
        {loading
          ? [1, 2, 3].map((i) => <SkeletonCard key={i} />)
          : sessions.length === 0
            ? <EmptyState icon="📝" message="Nenhuma aula realizada" />
            : sessions.map((sess) => (
                <TouchableOpacity key={sess.id} onPress={() => openSession(sess)}>
                  <Card>
                    <Text style={s.sessSubject}>{sess.subject?.name ?? 'Aula'}</Text>
                    <Text style={s.sessDate}>{new Date(sess.scheduledAt).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}</Text>
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
  sessionDate: { fontSize: 13, color: colors.muted, marginBottom: 12, fontStyle: 'italic' },
  label: { fontSize: 13, fontWeight: '600', color: colors.muted, marginBottom: 6 },
  inputBox: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 16, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, elevation: 2 },
  textarea: { borderWidth: 1, borderColor: colors.border, borderRadius: 8, padding: 12, fontSize: 14, color: colors.text, minHeight: 100, textAlignVertical: 'top' },
  section: { fontSize: 13, fontWeight: '700', color: colors.muted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  noteContent: { fontSize: 14, color: colors.text, lineHeight: 20 },
  noteDate: { fontSize: 11, color: colors.muted, marginTop: 6 },
  sessSubject: { fontSize: 15, fontWeight: '700', color: colors.text },
  sessDate: { fontSize: 12, color: colors.muted, marginTop: 2 },
});
