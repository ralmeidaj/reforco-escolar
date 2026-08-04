import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, Alert, ActivityIndicator } from 'react-native';
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

      <View style={s.content}>
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
          </>
        ) : null}

        <Button
          label={loggingOut ? 'Saindo...' : 'Sair da conta'}
          onPress={confirmLogout}
          loading={loggingOut}
          variant="danger"
          style={{ marginTop: 24 }}
        />
      </View>
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

const s = StyleSheet.create({
  safe:       { flex: 1, backgroundColor: colors.bg },
  header:     { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 },
  title:      { fontSize: 22, fontWeight: '700', color: colors.text },
  content:    { flex: 1, padding: 16 },
  avatar:     { width: 72, height: 72, borderRadius: 36, backgroundColor: '#2563EB', alignItems: 'center', justifyContent: 'center', alignSelf: 'center', marginTop: 24 },
  avatarText: { fontSize: 30, fontWeight: '700', color: '#fff' },
  name:       { fontSize: 20, fontWeight: '700', color: colors.text, textAlign: 'center', marginTop: 12 },
  role:       { fontSize: 14, color: colors.muted, textAlign: 'center', marginTop: 4 },
  row:        { paddingVertical: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  rowBorder:  { borderBottomWidth: 1, borderBottomColor: colors.border },
  rowLabel:   { fontSize: 14, color: colors.muted },
  rowValue:   { fontSize: 14, color: colors.text, fontWeight: '500', flexShrink: 1, textAlign: 'right', marginLeft: 8 },
});
