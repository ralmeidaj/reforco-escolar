import { useEffect, useState } from 'react';
import { View, Text, ScrollView, TextInput, TouchableOpacity, StyleSheet, Modal, Image, Alert, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { api } from '../../../lib/api';
import { Card, Button, SkeletonCard, EmptyState, colors } from '../../../components/ui';

interface Task {
  id: string;
  title: string;
  description: string | null;
  dueDate: string | null;
  type: string;
  done: boolean;
}

interface Capture {
  id: string;
  subject: string | null;
  title: string;
  description: string | null;
  dueDate: string | null;
  imageUrl: string;
}

const TYPE_ICONS: Record<string, string> = {
  padrao: '📌', trabalho: '📚', eureka: '💡', trilha: '🗺️',
};

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
  const [section, setSection] = useState<'reforco' | 'escola'>('reforco');

  // ── Seção "Do Reforço" ────────────────────────────────────────────────────
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [marking, setMarking] = useState<string | null>(null);
  const [filter, setFilter] = useState<'pending' | 'done'>('pending');

  useEffect(() => { loadTasks(); }, []);

  async function loadTasks() {
    setLoading(true);
    try {
      const res = await api.get('/tasks/me');
      setTasks(res.data);
    } catch {}
    setLoading(false);
  }

  const onRefresh = async () => {
    setRefreshing(true);
    if (section === 'reforco') await loadTasks(); else await loadCaptures();
    setRefreshing(false);
  };

  async function markDone(id: string) {
    setMarking(id);
    try {
      await api.patch(`/tasks/${id}/done`);
      setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, done: true } : t)));
    } catch {}
    setMarking(null);
  }

  const isOverdue = (t: Task) =>
    !t.done && t.dueDate && new Date(t.dueDate) < new Date();

  const visibleTasks = tasks.filter((t) => (filter === 'done' ? t.done : !t.done));

  // ── Seção "Da Escola" ─────────────────────────────────────────────────────
  const [captures, setCaptures] = useState<Capture[]>([]);
  const [loadingCaptures, setLoadingCaptures] = useState(true);
  const [captureStep, setCaptureStep] = useState<'idle' | 'photo' | 'review'>('idle');
  const [photo, setPhoto] = useState<{ uri: string; type: string; name: string } | null>(null);
  const [extracting, setExtracting] = useState(false);
  const [reviewImageUrl, setReviewImageUrl] = useState('');
  const [reviewSubject, setReviewSubject] = useState('');
  const [reviewTitle, setReviewTitle] = useState('');
  const [reviewDesc, setReviewDesc] = useState('');
  const [reviewDueDate, setReviewDueDate] = useState('');
  const [confirming, setConfirming] = useState(false);

  useEffect(() => { if (section === 'escola') loadCaptures(); }, [section]);

  async function loadCaptures() {
    setLoadingCaptures(true);
    try {
      const res = await api.get('/tasks/school-captures/me');
      setCaptures(res.data);
    } catch {}
    setLoadingCaptures(false);
  }

  async function takePhotoForCapture() {
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

  async function pickPhotoForCapture() {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: 'images', quality: 0.8 });
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      setPhoto({ uri: asset.uri, type: asset.mimeType ?? 'image/jpeg', name: asset.fileName ?? 'foto.jpg' });
    }
  }

  async function extractCapture() {
    if (!photo) return;
    setExtracting(true);
    try {
      const form = new FormData();
      form.append('file', { uri: photo.uri, type: photo.type, name: photo.name } as any);
      const res = await api.post('/tasks/school-captures/extract', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const { imageUrl, extracted } = res.data;
      setReviewImageUrl(imageUrl);
      setReviewSubject(extracted?.subject ?? '');
      setReviewTitle(extracted?.title ?? '');
      setReviewDesc(extracted?.description ?? '');
      setReviewDueDate(extracted?.dueDate ?? '');
      setCaptureStep('review');
    } catch {
      Alert.alert('Erro', 'Não foi possível processar a foto. Tente novamente.');
    }
    setExtracting(false);
  }

  async function confirmCapture() {
    if (!reviewTitle.trim()) {
      Alert.alert('Campo obrigatório', 'Preencha o título da tarefa');
      return;
    }
    setConfirming(true);
    try {
      await api.post('/tasks/school-captures/confirm', {
        imageUrl: reviewImageUrl,
        subject: reviewSubject.trim() || undefined,
        title: reviewTitle.trim(),
        description: reviewDesc.trim() || undefined,
        dueDate: reviewDueDate || undefined,
      });
      resetCaptureFlow();
      await loadCaptures();
    } catch {
      Alert.alert('Erro', 'Não foi possível salvar a tarefa. Tente novamente.');
    }
    setConfirming(false);
  }

  function resetCaptureFlow() {
    setCaptureStep('idle');
    setPhoto(null);
    setReviewImageUrl('');
    setReviewSubject('');
    setReviewTitle('');
    setReviewDesc('');
    setReviewDueDate('');
  }

  // ── Fluxo de captura — passo 1: foto ──────────────────────────────────────
  if (captureStep === 'photo') {
    return (
      <SafeAreaView style={s.safe}>
        <View style={s.header}>
          <TouchableOpacity onPress={resetCaptureFlow}><Text style={s.back}>← Cancelar</Text></TouchableOpacity>
          <Text style={s.headerTitle}>Capturar tarefa</Text>
        </View>
        <ScrollView contentContainerStyle={s.content}>
          <Text style={s.sub}>Fotografe ou selecione o print da tarefa que a escola passou</Text>

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
            <TouchableOpacity onPress={takePhotoForCapture} style={s.captureBtn}>
              <Text style={s.captureBtnText}>📷 Câmera</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={pickPhotoForCapture} style={s.captureBtn}>
              <Text style={s.captureBtnText}>🖼️ Galeria</Text>
            </TouchableOpacity>
          </View>

          {photo && (
            <Button
              label={extracting ? 'Processando...' : 'Continuar'}
              onPress={extractCapture}
              loading={extracting}
              style={{ marginTop: 16 }}
            />
          )}
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ── Fluxo de captura — passo 2: revisão ────────────────────────────────────
  if (captureStep === 'review') {
    return (
      <SafeAreaView style={s.safe}>
        <View style={s.header}>
          <TouchableOpacity onPress={resetCaptureFlow}><Text style={s.back}>← Cancelar</Text></TouchableOpacity>
          <Text style={s.headerTitle}>Revisar tarefa</Text>
        </View>
        <ScrollView contentContainerStyle={s.content}>
          <Text style={s.sub}>Confira e ajuste os dados antes de confirmar</Text>

          <Text style={s.label}>Disciplina</Text>
          <TextInput style={s.input} value={reviewSubject} onChangeText={setReviewSubject} placeholder="Ex: Matemática" />

          <Text style={s.label}>Título *</Text>
          <TextInput style={s.input} value={reviewTitle} onChangeText={setReviewTitle} placeholder="Ex: Página 45, exercícios 1-10" />

          <Text style={s.label}>Descrição</Text>
          <TextInput style={[s.input, s.textarea]} value={reviewDesc} onChangeText={setReviewDesc} placeholder="Detalhes da tarefa..." multiline numberOfLines={3} />

          <Text style={s.label}>Prazo</Text>
          <DatePickerInput value={reviewDueDate} onChange={setReviewDueDate} />

          <Button
            label={confirming ? 'Salvando...' : 'Confirmar'}
            onPress={confirmCapture}
            loading={confirming}
            style={{ marginTop: 20 }}
          />
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ── Tela principal ──────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={s.safe}>
      <View style={s.segmentRow}>
        {(['reforco', 'escola'] as const).map((sec) => (
          <TouchableOpacity key={sec} onPress={() => setSection(sec)} style={[s.segment, section === sec && s.segmentActive]}>
            <Text style={[s.segmentText, section === sec && s.segmentTextActive]}>
              {sec === 'reforco' ? 'Do Reforço' : 'Da Escola'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {section === 'reforco' ? (
        <>
          <View style={s.tabs}>
            {(['pending', 'done'] as const).map((f) => (
              <TouchableOpacity key={f} onPress={() => setFilter(f)} style={[s.tab, filter === f && s.tabActive]}>
                <Text style={[s.tabText, filter === f && s.tabTextActive]}>
                  {f === 'pending' ? 'Pendentes' : 'Concluídas'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={s.content}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          >
            {loading
              ? [1, 2, 3].map((i) => <SkeletonCard key={i} height={72} />)
              : visibleTasks.length === 0
                ? <EmptyState icon={filter === 'pending' ? '🎉' : '📋'} message={filter === 'pending' ? 'Nenhuma tarefa pendente!' : 'Nenhuma tarefa concluída ainda'} />
                : visibleTasks.map((task) => (
                    <Card key={task.id}>
                      <View style={row.row}>
                        <Text style={s.icon}>{TYPE_ICONS[task.type] ?? '📌'}</Text>
                        <View style={{ flex: 1 }}>
                          <Text style={s.title}>{task.title}</Text>
                          {task.dueDate && (
                            <Text style={[s.due, isOverdue(task) && s.dueOverdue]}>
                              Prazo: {new Date(task.dueDate).toLocaleDateString('pt-BR')}
                              {isOverdue(task) ? ' ⚠️ Atrasada' : ''}
                            </Text>
                          )}
                        </View>
                        {filter === 'pending' && (
                          <TouchableOpacity
                            onPress={() => markDone(task.id)}
                            disabled={marking === task.id}
                            style={[s.checkBtn, marking === task.id && { opacity: 0.5 }]}
                          >
                            <Text style={s.checkText}>{marking === task.id ? '...' : '✓'}</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    </Card>
                  ))
            }
          </ScrollView>
        </>
      ) : (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={s.content}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          <Button label="+ Capturar tarefa" onPress={() => setCaptureStep('photo')} style={{ marginBottom: 16 }} />

          {loadingCaptures
            ? [1, 2, 3].map((i) => <SkeletonCard key={i} height={72} />)
            : captures.length === 0
              ? <EmptyState icon="🏫" message="Nenhuma tarefa da escola capturada ainda" />
              : captures.map((c) => (
                  <Card key={c.id}>
                    <View style={row.row}>
                      <Image source={{ uri: c.imageUrl }} style={s.thumb} />
                      <View style={{ flex: 1 }}>
                        {c.subject && <Text style={s.captureSubject}>{c.subject}</Text>}
                        <Text style={s.title}>{c.title}</Text>
                        {c.description && <Text style={s.captureDesc}>{c.description}</Text>}
                        {c.dueDate && (
                          <Text style={s.due}>Prazo: {new Date(c.dueDate).toLocaleDateString('pt-BR')}</Text>
                        )}
                      </View>
                    </View>
                  </Card>
                ))
          }
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: 'row', alignItems: 'center', padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderColor: colors.border, gap: 12 },
  back: { fontSize: 14, color: colors.primary, fontWeight: '600' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: colors.text, flex: 1 },
  segmentRow: { flexDirection: 'row', backgroundColor: '#fff', padding: 8, gap: 8, borderBottomWidth: 1, borderColor: colors.border },
  segment: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 8, backgroundColor: '#F3F4F6' },
  segmentActive: { backgroundColor: colors.primary },
  segmentText: { fontSize: 13, fontWeight: '600', color: colors.muted },
  segmentTextActive: { color: '#fff' },
  tabs: { flexDirection: 'row', backgroundColor: '#fff', borderBottomWidth: 1, borderColor: colors.border },
  tab: { flex: 1, paddingVertical: 12, alignItems: 'center' },
  tabActive: { borderBottomWidth: 2, borderColor: colors.primary },
  tabText: { fontSize: 14, color: colors.muted },
  tabTextActive: { color: colors.primary, fontWeight: '600' },
  content: { padding: 16, paddingBottom: 40 },
  icon: { fontSize: 22, marginRight: 8 },
  title: { fontSize: 15, fontWeight: '600', color: colors.text },
  due: { fontSize: 12, color: colors.muted, marginTop: 2 },
  dueOverdue: { color: colors.danger },
  checkBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#DCFCE7', alignItems: 'center', justifyContent: 'center' },
  checkText: { fontSize: 18, color: colors.success },
  thumb: { width: 48, height: 48, borderRadius: 8, marginRight: 10, backgroundColor: colors.border },
  captureSubject: { fontSize: 11, fontWeight: '700', color: colors.primary, textTransform: 'uppercase' },
  captureDesc: { fontSize: 13, color: colors.muted, marginTop: 2 },
  sub: { fontSize: 14, color: colors.muted, marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '600', color: colors.muted, marginBottom: 6, marginTop: 12 },
  input: { backgroundColor: '#fff', borderWidth: 1, borderColor: colors.border, borderRadius: 8, padding: 10, fontSize: 14, color: colors.text },
  textarea: { minHeight: 72, textAlignVertical: 'top' },
  previewBox: { borderRadius: 12, overflow: 'hidden', marginBottom: 16 },
  preview: { width: '100%', height: 260 },
  removeBtn: { backgroundColor: '#FEE2E2', padding: 8, alignItems: 'center' },
  removeBtnText: { color: colors.danger, fontWeight: '600', fontSize: 13 },
  placeholder: { height: 200, backgroundColor: '#F3F4F6', borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 16, borderWidth: 2, borderColor: colors.border, borderStyle: 'dashed' },
  placeholderIcon: { fontSize: 48, marginBottom: 8 },
  placeholderText: { fontSize: 14, color: colors.muted },
  btnRow: { flexDirection: 'row', gap: 12 },
  captureBtn: { flex: 1, backgroundColor: '#fff', borderRadius: 10, paddingVertical: 14, alignItems: 'center', borderWidth: 1, borderColor: colors.border },
  captureBtnText: { fontSize: 15, fontWeight: '600', color: colors.text },
});
const row = StyleSheet.create({ row: { flexDirection: 'row', alignItems: 'center' } });

const dp = StyleSheet.create({
  btn: { backgroundColor: '#fff', borderWidth: 1, borderColor: colors.border, borderRadius: 8, padding: 10 },
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
