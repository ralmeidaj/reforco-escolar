import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card, colors } from '../../../components/ui';
import { RegistrationsScreen } from './RegistrationsScreen';
import { ProfileScreen } from '../shared/ProfileScreen';

type Screen = 'hub' | 'cadastros' | 'perfil';

const ITEMS: { key: Exclude<Screen, 'hub'>; icon: string; label: string; description: string }[] = [
  { key: 'cadastros', icon: '📋', label: 'Cadastros', description: 'Disciplinas, turmas, matrículas e usuários' },
  { key: 'perfil', icon: '👤', label: 'Perfil', description: 'Seus dados, senha, chave de IA e sair da conta' },
];

export function MoreScreen() {
  const [view, setView] = useState<Screen>('hub');

  if (view !== 'hub') {
    return (
      <>
        <SafeAreaView edges={['top']} style={s.backBarSafe}>
          <TouchableOpacity onPress={() => setView('hub')} style={s.backBar}>
            <Text style={s.backText}>← Voltar</Text>
          </TouchableOpacity>
        </SafeAreaView>
        {view === 'cadastros' ? <RegistrationsScreen embedded /> : <ProfileScreen embedded />}
      </>
    );
  }

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.header}>
        <Text style={s.headerTitle}>Mais</Text>
      </View>
      <View style={s.content}>
        {ITEMS.map((item) => (
          <TouchableOpacity key={item.key} onPress={() => setView(item.key)}>
            <Card style={{ marginBottom: 10 }}>
              <View style={s.itemRow}>
                <Text style={s.itemIcon}>{item.icon}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={s.itemLabel}>{item.label}</Text>
                  <Text style={s.itemDesc}>{item.description}</Text>
                </View>
                <Text style={s.chevron}>›</Text>
              </View>
            </Card>
          </TouchableOpacity>
        ))}
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: { padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderColor: colors.border },
  headerTitle: { fontSize: 18, fontWeight: '700', color: colors.text },
  content: { flex: 1, padding: 16 },
  itemRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  itemIcon: { fontSize: 26 },
  itemLabel: { fontSize: 15, fontWeight: '700', color: colors.text },
  itemDesc: { fontSize: 12, color: colors.muted, marginTop: 2 },
  chevron: { fontSize: 22, color: colors.muted },
  backBarSafe: { backgroundColor: '#fff', borderBottomWidth: 1, borderColor: colors.border },
  backBar: { paddingHorizontal: 16, paddingVertical: 12 },
  backText: { fontSize: 14, color: colors.primary, fontWeight: '600' },
});
