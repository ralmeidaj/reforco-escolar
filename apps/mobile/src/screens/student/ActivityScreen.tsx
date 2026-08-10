import { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, Image, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { api } from '../../../lib/api';
import { toLocalPhoto } from '../../../lib/photoPicker';
import { Card, Button, EmptyState, SkeletonCard, colors } from '../../../components/ui';

interface PendingTask { id: string; title: string; dueDate: string | null }

export function ActivityScreen() {
  const [tasks, setTasks] = useState<PendingTask[]>([]);
  const [loadingTasks, setLoadingTasks] = useState(true);
  const [selectedTask, setSelectedTask] = useState<PendingTask | null>(null);
  const [image, setImage] = useState<{ uri: string; type: string; name: string } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    api.get('/tasks/me')
      .then((res) => setTasks(res.data.filter((t: any) => !t.done)))
      .catch(() => {})
      .finally(() => setLoadingTasks(false));
  }, []);

  async function pickFromGallery() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'images',
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      setImage(await toLocalPhoto(result.assets[0]));
      setDone(false);
    }
  }

  async function takePhoto() {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permissão necessária', 'Permita o acesso à câmera nas configurações');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      setImage(await toLocalPhoto(result.assets[0]));
      setDone(false);
    }
  }

  async function upload() {
    if (!image || !selectedTask) return;
    setUploading(true);
    try {
      const form = new FormData();
      form.append('file', { uri: image.uri, type: image.type, name: image.name } as any);
      form.append('taskId', selectedTask.id);
      await api.post('/activity-submissions', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setDone(true);
      setImage(null);
      setTasks((prev) => prev.filter((t) => t.id !== selectedTask.id));
      setSelectedTask(null);
      Alert.alert('Enviado!', 'Sua atividade foi enviada com sucesso.');
    } catch (e: any) {
      Alert.alert('Erro', e.response?.data?.message ?? 'Falha ao enviar. Tente novamente.');
    }
    setUploading(false);
  }

  if (!selectedTask) {
    return (
      <SafeAreaView style={s.safe}>
        <ScrollView contentContainerStyle={s.content}>
          <Text style={s.title}>Enviar Atividade</Text>
          <Text style={s.sub}>Escolha a tarefa que você concluiu e corrigiu</Text>

          {loadingTasks
            ? [1, 2, 3].map((i) => <SkeletonCard key={i} height={64} />)
            : tasks.length === 0
              ? <EmptyState icon="🎉" message="Nenhuma tarefa pendente para enviar atividade" />
              : tasks.map((t) => (
                  <TouchableOpacity key={t.id} onPress={() => setSelectedTask(t)}>
                    <Card style={{ marginBottom: 8 }}>
                      <Text style={s.taskTitle}>{t.title}</Text>
                      {t.dueDate && (
                        <Text style={s.taskDue}>Prazo: {new Date(t.dueDate).toLocaleDateString('pt-BR')}</Text>
                      )}
                    </Card>
                  </TouchableOpacity>
                ))
          }
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView contentContainerStyle={s.content}>
        <TouchableOpacity onPress={() => setSelectedTask(null)} style={{ marginBottom: 8 }}>
          <Text style={s.back}>← Trocar tarefa</Text>
        </TouchableOpacity>
        <Text style={s.title}>Enviar Atividade</Text>
        <Text style={s.sub}>{selectedTask.title}</Text>

        {image ? (
          <View style={s.previewBox}>
            <Image source={{ uri: image.uri }} style={s.preview} resizeMode="cover" />
            <TouchableOpacity onPress={() => setImage(null)} style={s.removeBtn}>
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
          <TouchableOpacity onPress={pickFromGallery} style={s.captureBtn}>
            <Text style={s.captureBtnText}>🖼️ Galeria</Text>
          </TouchableOpacity>
        </View>

        {image && (
          <Button
            label={uploading ? 'Enviando...' : 'Enviar atividade'}
            onPress={upload}
            loading={uploading}
            style={{ marginTop: 16 }}
          />
        )}

        {done && (
          <View style={s.successBox}>
            <Text style={s.successText}>✅ Atividade enviada com sucesso!</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 24, paddingBottom: 40 },
  title: { fontSize: 22, fontWeight: '700', color: colors.text, marginBottom: 4 },
  sub: { fontSize: 14, color: colors.muted, marginBottom: 24 },
  back: { fontSize: 13, color: colors.primary, fontWeight: '600' },
  taskTitle: { fontSize: 15, fontWeight: '600', color: colors.text },
  taskDue: { fontSize: 12, color: colors.muted, marginTop: 2 },
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
  successBox: { marginTop: 16, backgroundColor: '#DCFCE7', borderRadius: 10, padding: 14, alignItems: 'center' },
  successText: { color: '#15803D', fontWeight: '600', fontSize: 14 },
});
