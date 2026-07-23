import { useState, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, Alert, Image, ScrollView } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { api } from '../../../lib/api';
import { Button, colors } from '../../../components/ui';

export default function ActivityUpload() {
  const [image, setImage] = useState<{ uri: string; type: string; name: string } | null>(null);
  const [taskId, setTaskId] = useState('');
  const [uploading, setUploading] = useState(false);
  const [done, setDone] = useState(false);

  async function pickFromGallery() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'images',
      quality: 0.8,
      allowsEditing: true,
    });
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      setImage({ uri: asset.uri, type: asset.mimeType ?? 'image/jpeg', name: asset.fileName ?? 'foto.jpg' });
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
      allowsEditing: true,
    });
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      setImage({ uri: asset.uri, type: asset.mimeType ?? 'image/jpeg', name: asset.fileName ?? 'foto.jpg' });
      setDone(false);
    }
  }

  async function upload() {
    if (!image) return;
    setUploading(true);
    try {
      const form = new FormData();
      form.append('file', { uri: image.uri, type: image.type, name: image.name } as any);
      if (taskId.trim()) form.append('taskId', taskId.trim());

      await api.post('/attendance/activity-submissions', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setDone(true);
      setImage(null);
      setTaskId('');
      Alert.alert('Enviado!', 'Sua atividade foi enviada com sucesso.');
    } catch (e: any) {
      Alert.alert('Erro', e.response?.data?.message ?? 'Falha ao enviar. Tente novamente.');
    }
    setUploading(false);
  }

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView contentContainerStyle={s.content}>
        <Text style={s.title}>Enviar Atividade</Text>
        <Text style={s.sub}>Fotografe ou selecione a atividade feita e corrigida</Text>

        {/* Preview */}
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

        {/* Botões de captura */}
        <View style={s.btnRow}>
          <TouchableOpacity onPress={takePhoto} style={s.captureBtn}>
            <Text style={s.captureBtnText}>📷 Câmera</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={pickFromGallery} style={s.captureBtn}>
            <Text style={s.captureBtnText}>🖼️ Galeria</Text>
          </TouchableOpacity>
        </View>

        {/* Upload */}
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
