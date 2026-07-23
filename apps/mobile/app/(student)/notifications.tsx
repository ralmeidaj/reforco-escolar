import { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, SafeAreaView } from 'react-native';
import { api } from '../../lib/api';
import { Card, SkeletonCard, EmptyState, colors } from '../../components/ui';

interface Notification {
  id: string;
  title: string;
  body: string;
  type: string;
  readAt: string | null;
  createdAt: string;
}

const TYPE_ICONS: Record<string, string> = {
  info: 'ℹ️', task: '📋', attendance: '📅', session: '📚', finance: '💳',
};

export default function NotificationsScreen() {
  const [items, setItems] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, []);

  async function load() {
    try {
      const res = await api.get('/notifications');
      setItems(res.data);
    } catch {}
    setLoading(false);
  }

  async function markRead(id: string) {
    try {
      await api.patch(`/notifications/${id}/read`);
      setItems((prev) => prev.map((n) => n.id === id ? { ...n, readAt: new Date().toISOString() } : n));
    } catch {}
  }

  async function markAllRead() {
    try {
      await api.patch('/notifications/read-all');
      setItems((prev) => prev.map((n) => ({ ...n, readAt: n.readAt ?? new Date().toISOString() })));
    } catch {}
  }

  const unread = items.filter((n) => !n.readAt).length;

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.header}>
        <Text style={s.title}>Notificações {unread > 0 ? `(${unread})` : ''}</Text>
        {unread > 0 && (
          <TouchableOpacity onPress={markAllRead}>
            <Text style={s.markAll}>Marcar todas</Text>
          </TouchableOpacity>
        )}
      </View>
      <ScrollView contentContainerStyle={s.content}>
        {loading
          ? [1, 2, 3].map((i) => <SkeletonCard key={i} height={72} />)
          : items.length === 0
            ? <EmptyState icon="🔔" message="Nenhuma notificação" />
            : items.map((n) => (
                <TouchableOpacity key={n.id} onPress={() => !n.readAt && markRead(n.id)} activeOpacity={0.8}>
                  <Card style={!n.readAt ? s.unread : undefined}>
                    <View style={row.row}>
                      <Text style={s.icon}>{TYPE_ICONS[n.type] ?? '🔔'}</Text>
                      <View style={{ flex: 1 }}>
                        <Text style={[s.notifTitle, !n.readAt && s.bold]}>{n.title}</Text>
                        <Text style={s.body}>{n.body}</Text>
                        <Text style={s.time}>{new Date(n.createdAt).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}</Text>
                      </View>
                      {!n.readAt && <View style={s.dot} />}
                    </View>
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
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderColor: colors.border },
  title: { fontSize: 18, fontWeight: '700', color: colors.text },
  markAll: { fontSize: 13, color: colors.primary, fontWeight: '600' },
  content: { padding: 16, paddingBottom: 40 },
  unread: { borderLeftWidth: 3, borderLeftColor: colors.primary },
  icon: { fontSize: 22, marginRight: 10 },
  notifTitle: { fontSize: 14, color: colors.text },
  bold: { fontWeight: '700' },
  body: { fontSize: 13, color: colors.muted, marginTop: 2 },
  time: { fontSize: 11, color: colors.muted, marginTop: 4 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary, marginLeft: 4 },
});
const row = StyleSheet.create({ row: { flexDirection: 'row', alignItems: 'center' } });
