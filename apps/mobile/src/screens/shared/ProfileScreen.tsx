import { useEffect, useState } from 'react';
import { View, Text, ScrollView, TextInput, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '../../../lib/api';
import { useAuth } from '../../navigation/RootNavigator';
import { Button, Card, colors } from '../../../components/ui';

const ROLE_LABEL: Record<string, string> = {
  tenant_admin: 'Administrador',
  teacher:      'Professor',
  student:      'Aluno',
  guardian:     'Responsável',
};

export function ProfileScreen() {
  const { signOut } = useAuth();
  const [user, setUser]       = useState<{ name: string; email: string; role: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    api.get('/auth/me')
      .then(({ data }) => setUser(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  function confirmLogout() {
    Alert.alert('Sair', 'Deseja encerrar a sessão?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Sair', style: 'destructive', onPress: async () => {
          setLoggingOut(true);
          try { await api.post('/auth/logout'); } catch {}
          await signOut();
        },
      },
    ]);
  }

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.header}>
        <Text style={s.title}>Perfil</Text>
      </View>

      <ScrollView contentContainerStyle={s.content}>
        {loading ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
        ) : user ? (
          <>
            <View style={s.avatar}>
              <Text style={s.avatarText}>{user.name.charAt(0).toUpperCase()}</Text>
            </View>
            <Text style={s.name}>{user.name}</Text>
            <Text style={s.role}>{ROLE_LABEL[user.role] ?? user.role}</Text>

            <Card style={{ marginTop: 32 }}>
              <Row label="E-mail" value={user.email} />
              <Row label="Perfil" value={ROLE_LABEL[user.role] ?? user.role} last />
            </Card>

            {user.role === 'tenant_admin' && (
              <AdminSettings
                user={user}
                onProfileUpdated={(u) => setUser((prev) => (prev ? { ...prev, ...u } : prev))}
              />
            )}
          </>
        ) : null}

        <Button
          label={loggingOut ? 'Saindo...' : 'Sair da conta'}
          onPress={confirmLogout}
          loading={loggingOut}
          variant="danger"
          style={{ marginTop: 24 }}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

function Row({ label, value, last }: { label: string; value: string; last?: boolean }) {
  return (
    <View style={[s.row, !last && s.rowBorder]}>
      <Text style={s.rowLabel}>{label}</Text>
      <Text style={s.rowValue}>{value}</Text>
    </View>
  );
}

// ── Configurações (só tenant_admin) ─────────────────────────────────────────

function AdminSettings({
  user, onProfileUpdated,
}: {
  user: { name: string; email: string };
  onProfileUpdated: (u: { name: string; email: string }) => void;
}) {
  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email);
  const [savingProfile, setSavingProfile] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);

  const [aiStatus, setAiStatus] = useState<{ hasKey: boolean; keyPreview: string | null } | null>(null);
  const [newApiKey, setNewApiKey] = useState('');
  const [savingAiKey, setSavingAiKey] = useState(false);
  const [removingAiKey, setRemovingAiKey] = useState(false);

  useEffect(() => {
    api.get('/tenants/me/openai-key').then((res) => setAiStatus(res.data)).catch(() => {});
  }, []);

  async function saveProfile() {
    if (!name.trim() || !email.trim()) {
      Alert.alert('Campos obrigatórios', 'Preencha nome e e-mail');
      return;
    }
    setSavingProfile(true);
    try {
      await api.patch('/auth/profile', { name: name.trim(), email: email.trim() });
      onProfileUpdated({ name: name.trim(), email: email.trim() });
      Alert.alert('Salvo', 'Perfil atualizado com sucesso.');
    } catch (e: any) {
      Alert.alert('Erro', e.response?.data?.message ?? 'Não foi possível salvar o perfil');
    }
    setSavingProfile(false);
  }

  async function savePassword() {
    if (!newPassword) {
      Alert.alert('Campo obrigatório', 'Informe a nova senha');
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('Senhas não coincidem', 'A confirmação deve ser igual à nova senha');
      return;
    }
    setSavingPassword(true);
    try {
      await api.patch('/auth/profile', { currentPassword: currentPassword || undefined, newPassword });
      setCurrentPassword(''); setNewPassword(''); setConfirmPassword('');
      Alert.alert('Salvo', 'Senha alterada com sucesso.');
    } catch (e: any) {
      Alert.alert('Erro', e.response?.data?.message ?? 'Não foi possível alterar a senha');
    }
    setSavingPassword(false);
  }

  async function saveAiKey() {
    if (!newApiKey.trim()) return;
    setSavingAiKey(true);
    try {
      const res = await api.put('/tenants/me/openai-key', { apiKey: newApiKey.trim() });
      setAiStatus(res.data);
      setNewApiKey('');
      Alert.alert('Salvo', 'Chave da OpenAI configurada.');
    } catch (e: any) {
      Alert.alert('Erro', e.response?.data?.message ?? 'Não foi possível salvar a chave');
    }
    setSavingAiKey(false);
  }

  function removeAiKey() {
    Alert.alert(
      'Remover chave',
      'Deseja remover a chave própria da OpenAI? O sistema volta a usar a chave da plataforma.',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Remover', style: 'destructive', onPress: async () => {
            setRemovingAiKey(true);
            try {
              await api.delete('/tenants/me/openai-key');
              setAiStatus({ hasKey: false, keyPreview: null });
            } catch {
              Alert.alert('Erro', 'Não foi possível remover a chave');
            }
            setRemovingAiKey(false);
          },
        },
      ],
    );
  }

  return (
    <>
      <Card style={{ marginTop: 20 }}>
        <Text style={s.sectionTitle}>Editar perfil</Text>
        <Text style={s.label}>Nome</Text>
        <TextInput style={s.input} value={name} onChangeText={setName} />
        <Text style={s.label}>E-mail</Text>
        <TextInput style={s.input} value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
        <Button label={savingProfile ? 'Salvando...' : 'Salvar'} onPress={saveProfile} loading={savingProfile} style={{ marginTop: 12 }} />
      </Card>

      <Card style={{ marginTop: 16 }}>
        <Text style={s.sectionTitle}>Alterar senha</Text>
        <Text style={s.label}>Senha atual</Text>
        <TextInput style={s.input} value={currentPassword} onChangeText={setCurrentPassword} secureTextEntry placeholder="Deixe em branco para não alterar" />
        <Text style={s.label}>Nova senha</Text>
        <TextInput style={s.input} value={newPassword} onChangeText={setNewPassword} secureTextEntry placeholder="Mínimo 8 caracteres" />
        <Text style={s.label}>Confirmar nova senha</Text>
        <TextInput style={s.input} value={confirmPassword} onChangeText={setConfirmPassword} secureTextEntry />
        <Button label={savingPassword ? 'Salvando...' : 'Alterar senha'} onPress={savePassword} loading={savingPassword} style={{ marginTop: 12 }} />
      </Card>

      <Card style={{ marginTop: 16, marginBottom: 8 }}>
        <Text style={s.sectionTitle}>Integração de IA</Text>
        <Text style={s.hint}>
          {aiStatus?.hasKey
            ? `Chave própria configurada (•••• ${aiStatus.keyPreview})`
            : 'Usando a chave da OpenAI da plataforma (padrão).'}
        </Text>
        <Text style={s.label}>{aiStatus?.hasKey ? 'Substituir chave' : 'Chave da OpenAI'}</Text>
        <TextInput style={s.input} value={newApiKey} onChangeText={setNewApiKey} secureTextEntry placeholder="sk-..." autoCapitalize="none" />
        <View style={{ flexDirection: 'row', gap: 12, marginTop: 12 }}>
          {aiStatus?.hasKey && (
            <Button label={removingAiKey ? '...' : 'Remover chave'} variant="danger" onPress={removeAiKey} loading={removingAiKey} style={{ flex: 1 }} />
          )}
          <Button label={savingAiKey ? 'Salvando...' : 'Salvar chave'} onPress={saveAiKey} loading={savingAiKey} disabled={!newApiKey.trim()} style={{ flex: 1 }} />
        </View>
      </Card>
    </>
  );
}

const s = StyleSheet.create({
  safe:       { flex: 1, backgroundColor: colors.bg },
  header:     { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 },
  title:      { fontSize: 22, fontWeight: '700', color: colors.text },
  content:    { padding: 16, paddingBottom: 40 },
  avatar:     { width: 72, height: 72, borderRadius: 36, backgroundColor: '#2563EB', alignItems: 'center', justifyContent: 'center', alignSelf: 'center', marginTop: 24 },
  avatarText: { fontSize: 30, fontWeight: '700', color: '#fff' },
  name:       { fontSize: 20, fontWeight: '700', color: colors.text, textAlign: 'center', marginTop: 12 },
  role:       { fontSize: 14, color: colors.muted, textAlign: 'center', marginTop: 4 },
  row:        { paddingVertical: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  rowBorder:  { borderBottomWidth: 1, borderBottomColor: colors.border },
  rowLabel:   { fontSize: 14, color: colors.muted },
  rowValue:   { fontSize: 14, color: colors.text, fontWeight: '500', flexShrink: 1, textAlign: 'right', marginLeft: 8 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: colors.text, marginBottom: 10 },
  label:      { fontSize: 12, color: colors.muted, fontWeight: '600', marginBottom: 4, marginTop: 8 },
  input:      { backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: colors.border, borderRadius: 8, padding: 10, fontSize: 14, color: colors.text },
  hint:       { fontSize: 12, color: colors.muted, marginBottom: 4 },
});
