import { useCallback, useEffect, useState } from 'react';
import { View, Text, ScrollView, TextInput, TouchableOpacity, StyleSheet, Alert, Image } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Speech from 'expo-speech';
import { api } from '../../../lib/api';
import { Card, Badge, Button, SkeletonCard, EmptyState, SectionHeader, colors } from '../../../components/ui';

interface StudentLite { id: string; name: string; email: string; }

interface CorrectionQuestion {
  number: string;
  studentAnswer: string;
  status: 'correct' | 'wrong' | 'partial';
  feedback: string;
}

interface Correction {
  id: string;
  subject: string;
  gradeLevel: string | null;
  imageUrl: string;
  score: string | null;
  questions: CorrectionQuestion[] | null;
  summary: string | null;
  voiceOrientation: string | null;
  createdAt: string;
}

const STATUS_ICON: Record<string, string> = { correct: '✓', partial: '~', wrong: '✗' };
const STATUS_COLOR: Record<string, string> = { correct: colors.success, partial: colors.warning, wrong: colors.danger };

export function ActivityCorrectionPanel() {
  const [students, setStudents] = useState<StudentLite[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(true);
  const [studentSearch, setStudentSearch] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<StudentLite | null>(null);

  const [subject, setSubject] = useState('');
  const [gradeLevel, setGradeLevel] = useState('');
  const [photo, setPhoto] = useState<{ uri: string; type: string; name: string } | null>(null);
  const [correcting, setCorrecting] = useState(false);

  const [history, setHistory] = useState<Correction[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [newlyCreatedId, setNewlyCreatedId] = useState<string | null>(null);
  const [speakingId, setSpeakingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    api.get('/auth/users?role=student')
      .then((res) => setStudents(res.data))
      .catch(() => {})
      .finally(() => setLoadingStudents(false));
  }, []);

  useEffect(() => () => { Speech.stop(); }, []);

  const loadHistory = useCallback(async (studentId: string) => {
    setLoadingHistory(true);
    try {
      const res = await api.get(`/ai/activity-corrections/student/${studentId}`);
      setHistory(res.data);
    } catch {
      setHistory([]);
    }
    setLoadingHistory(false);
  }, []);

  function selectStudent(student: StudentLite) {
    setSelectedStudent(student);
    setNewlyCreatedId(null);
    loadHistory(student.id);
  }

  function changeStudent() {
    Speech.stop();
    setSpeakingId(null);
    setSelectedStudent(null);
    setPhoto(null);
    setHistory([]);
    setNewlyCreatedId(null);
  }

  async function takePhoto() {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permissão necessária', 'Permita o acesso à câmera nas configurações');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ quality: 0.8 });
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      setPhoto({ uri: asset.uri, type: asset.mimeType ?? 'image/jpeg', name: asset.fileName ?? 'foto.jpg' });
    }
  }

  async function pickPhoto() {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: 'images', quality: 0.8 });
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      setPhoto({ uri: asset.uri, type: asset.mimeType ?? 'image/jpeg', name: asset.fileName ?? 'foto.jpg' });
    }
  }

  async function submit() {
    if (!selectedStudent) return;
    if (!subject.trim()) {
      Alert.alert('Campo obrigatório', 'Informe a matéria/tema da atividade');
      return;
    }
    if (!photo) {
      Alert.alert('Foto obrigatória', 'Tire ou selecione a foto da atividade');
      return;
    }
    setCorrecting(true);
    try {
      const form = new FormData();
      form.append('file', { uri: photo.uri, type: photo.type, name: photo.name } as any);
      form.append('studentId', selectedStudent.id);
      form.append('subject', subject.trim());
      if (gradeLevel.trim()) form.append('gradeLevel', gradeLevel.trim());

      const res = await api.post('/ai/activity-corrections', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setHistory((prev) => [res.data, ...prev]);
      setNewlyCreatedId(res.data.id);
      setPhoto(null);
    } catch (e: any) {
      Alert.alert('Erro', e.response?.data?.message ?? 'Não foi possível corrigir a atividade. Tente novamente.');
    }
    setCorrecting(false);
  }

  function toggleSpeak(id: string, text: string) {
    if (speakingId === id) {
      Speech.stop();
      setSpeakingId(null);
      return;
    }
    Speech.stop();
    setSpeakingId(id);
    Speech.speak(text, {
      language: 'pt-BR',
      rate: 0.92,
      onDone: () => setSpeakingId(null),
      onStopped: () => setSpeakingId(null),
      onError: () => setSpeakingId(null),
    });
  }

  function removeCorrection(id: string) {
    Alert.alert('Excluir correção', 'Deseja excluir esta correção do histórico?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Excluir', style: 'destructive', onPress: async () => {
          setDeletingId(id);
          try {
            await api.delete(`/ai/activity-corrections/${id}`);
            setHistory((prev) => prev.filter((c) => c.id !== id));
            if (speakingId === id) { Speech.stop(); setSpeakingId(null); }
          } catch {
            Alert.alert('Erro', 'Não foi possível excluir a correção');
          }
          setDeletingId(null);
        },
      },
    ]);
  }

  const filteredStudents = students.filter((st) =>
    st.name.toLowerCase().includes(studentSearch.toLowerCase()) ||
    st.email.toLowerCase().includes(studentSearch.toLowerCase()),
  );

  return (
    <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
      {!selectedStudent ? (
        <>
          <Text style={s.hint}>Selecione o aluno para corrigir uma atividade</Text>
          <TextInput
            style={s.input}
            value={studentSearch}
            onChangeText={setStudentSearch}
            placeholder="Buscar aluno..."
          />
          <View style={{ height: 12 }} />
          {loadingStudents
            ? [1, 2, 3].map((i) => <SkeletonCard key={i} height={56} />)
            : filteredStudents.length === 0
              ? <EmptyState icon="🔎" message="Nenhum aluno encontrado" />
              : filteredStudents.map((st) => (
                  <TouchableOpacity key={st.id} onPress={() => selectStudent(st)}>
                    <Card style={{ marginBottom: 8 }}>
                      <Text style={s.studentName}>{st.name}</Text>
                      <Text style={s.studentEmail}>{st.email}</Text>
                    </Card>
                  </TouchableOpacity>
                ))
          }
        </>
      ) : (
        <>
          <View style={s.studentHeader}>
            <View style={{ flex: 1 }}>
              <Text style={s.studentHeaderLabel}>Aluno selecionado</Text>
              <Text style={s.studentHeaderName}>{selectedStudent.name}</Text>
            </View>
            <TouchableOpacity onPress={changeStudent}>
              <Text style={s.changeLink}>Trocar</Text>
            </TouchableOpacity>
          </View>

          <Text style={s.label}>Matéria/tema *</Text>
          <TextInput style={s.input} value={subject} onChangeText={setSubject} placeholder="Ex: Matemática — frações" />

          <Text style={s.label}>Série/ano escolar</Text>
          <TextInput style={s.input} value={gradeLevel} onChangeText={setGradeLevel} placeholder="Ex: 5º ano" />

          <Text style={s.label}>Foto da atividade *</Text>
          {photo ? (
            <View style={s.previewBox}>
              <Image source={{ uri: photo.uri }} style={s.preview} resizeMode="cover" />
              <TouchableOpacity onPress={() => setPhoto(null)} style={s.removeBtn}>
                <Text style={s.removeBtnText}>✕ Remover</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={s.placeholder}>
              <Text style={s.placeholderIcon}>📷</Text>
              <Text style={s.placeholderText}>Nenhuma imagem selecionada</Text>
            </View>
          )}
          <View style={s.btnRow}>
            <TouchableOpacity onPress={takePhoto} style={s.captureBtn}>
              <Text style={s.captureBtnText}>📷 Câmera</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={pickPhoto} style={s.captureBtn}>
              <Text style={s.captureBtnText}>🖼️ Galeria</Text>
            </TouchableOpacity>
          </View>

          <Button
            label={correcting ? 'Lendo a letra e corrigindo...' : 'Corrigir atividade'}
            onPress={submit}
            loading={correcting}
            disabled={correcting || !photo || !subject.trim()}
            style={{ marginTop: 16 }}
          />

          <SectionHeader title={`Histórico (${history.length})`} />
          {loadingHistory
            ? [1, 2].map((i) => <SkeletonCard key={i} height={80} />)
            : history.length === 0
              ? <EmptyState icon="🗒️" message="Nenhuma correção registrada para este aluno ainda" />
              : history.map((item) => (
                  <HistoryItem
                    key={item.id}
                    correction={item}
                    defaultExpanded={item.id === newlyCreatedId}
                    speakingId={speakingId}
                    onSpeak={toggleSpeak}
                    onDelete={removeCorrection}
                    deleting={deletingId === item.id}
                  />
                ))
          }
        </>
      )}
    </ScrollView>
  );
}

function HistoryItem({
  correction, defaultExpanded, speakingId, onSpeak, onDelete, deleting,
}: {
  correction: Correction;
  defaultExpanded: boolean;
  speakingId: string | null;
  onSpeak: (id: string, text: string) => void;
  onDelete: (id: string) => void;
  deleting: boolean;
}) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const questions = correction.questions ?? [];
  const correctCount = questions.filter((q) => q.status === 'correct').length;
  const isGood = questions.length > 0 && correctCount / questions.length >= 0.7;

  return (
    <Card style={{ marginBottom: 8 }}>
      <TouchableOpacity onPress={() => setExpanded((e) => !e)} style={h.headerRow}>
        <View style={{ flex: 1 }}>
          <Text style={h.subject}>{correction.subject}{correction.gradeLevel ? ` · ${correction.gradeLevel}` : ''}</Text>
          <Text style={h.date}>{new Date(correction.createdAt).toLocaleDateString('pt-BR')}</Text>
        </View>
        <Badge label={correction.score ?? '—'} variant={isGood ? 'success' : 'danger'} />
      </TouchableOpacity>

      {expanded && (
        <View style={h.detail}>
          {questions.map((q) => (
            <View key={q.number} style={h.qRow}>
              <Text style={[h.qMark, { color: STATUS_COLOR[q.status] ?? colors.muted }]}>{STATUS_ICON[q.status] ?? '?'}</Text>
              <View style={{ flex: 1 }}>
                <Text style={h.qText}>Questão {q.number}: <Text style={h.qAnswer}>{q.studentAnswer}</Text></Text>
                <Text style={h.qFeedback}>{q.feedback}</Text>
              </View>
            </View>
          ))}

          {correction.summary && <Text style={h.summary}>{correction.summary}</Text>}

          <View style={h.actionsRow}>
            {correction.voiceOrientation && (
              <Button
                label={speakingId === correction.id ? '⏹ Parar áudio' : '🔊 Ouvir orientação'}
                variant="ghost"
                onPress={() => onSpeak(correction.id, correction.voiceOrientation!)}
                style={{ flex: 1 }}
              />
            )}
            <TouchableOpacity onPress={() => onDelete(correction.id)} disabled={deleting} style={h.deleteBtn}>
              <Text style={h.deleteBtnText}>{deleting ? '...' : '🗑 Excluir'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </Card>
  );
}

const s = StyleSheet.create({
  content: { padding: 16, paddingBottom: 40 },
  hint: { fontSize: 13, color: colors.muted, marginBottom: 12 },
  label: { fontSize: 13, fontWeight: '600', color: colors.muted, marginBottom: 6, marginTop: 12 },
  input: { backgroundColor: '#fff', borderWidth: 1, borderColor: colors.border, borderRadius: 8, padding: 10, fontSize: 14, color: colors.text },
  studentName: { fontSize: 14, fontWeight: '600', color: colors.text },
  studentEmail: { fontSize: 12, color: colors.muted, marginTop: 2 },
  studentHeader: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: colors.border },
  studentHeaderLabel: { fontSize: 11, color: colors.muted, textTransform: 'uppercase', letterSpacing: 0.5 },
  studentHeaderName: { fontSize: 15, fontWeight: '700', color: colors.text, marginTop: 2 },
  changeLink: { fontSize: 13, color: colors.primary, fontWeight: '600' },
  previewBox: { borderRadius: 12, overflow: 'hidden', marginTop: 4 },
  preview: { width: '100%', height: 220 },
  removeBtn: { backgroundColor: '#FEE2E2', padding: 8, alignItems: 'center' },
  removeBtnText: { color: colors.danger, fontWeight: '600', fontSize: 13 },
  placeholder: { height: 160, backgroundColor: '#F3F4F6', borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginTop: 4, borderWidth: 2, borderColor: colors.border, borderStyle: 'dashed' },
  placeholderIcon: { fontSize: 40, marginBottom: 6 },
  placeholderText: { fontSize: 13, color: colors.muted },
  btnRow: { flexDirection: 'row', gap: 12, marginTop: 12 },
  captureBtn: { flex: 1, backgroundColor: '#fff', borderRadius: 10, paddingVertical: 12, alignItems: 'center', borderWidth: 1, borderColor: colors.border },
  captureBtnText: { fontSize: 14, fontWeight: '600', color: colors.text },
});

const h = StyleSheet.create({
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  subject: { fontSize: 14, fontWeight: '600', color: colors.text },
  date: { fontSize: 12, color: colors.muted, marginTop: 2 },
  detail: { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderColor: colors.border, gap: 10 },
  qRow: { flexDirection: 'row', gap: 8 },
  qMark: { fontSize: 16, fontWeight: '700', width: 20 },
  qText: { fontSize: 13, color: colors.text },
  qAnswer: { fontWeight: '600' },
  qFeedback: { fontSize: 12, color: colors.muted, marginTop: 2 },
  summary: { fontSize: 13, color: colors.text, fontStyle: 'italic', backgroundColor: '#F3F4F6', borderRadius: 8, padding: 10 },
  actionsRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  deleteBtn: { paddingHorizontal: 8, paddingVertical: 10 },
  deleteBtnText: { fontSize: 13, color: colors.danger, fontWeight: '600' },
});
