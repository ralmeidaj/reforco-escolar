import { useCallback, useEffect, useState } from 'react';
import { View, Text, ScrollView, TextInput, TouchableOpacity, StyleSheet, SafeAreaView, Alert } from 'react-native';
import { api } from '../../../lib/api';
import { Card, Button, SkeletonCard, EmptyState, colors } from '../../../components/ui';

interface Room {
  id: string;
  name: string;
  capacity: number;
  currentCount?: number;
}

export default function AdminRooms() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [capacity, setCapacity] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    Promise.all([
      api.get('/rooms'),
      api.get('/rooms/occupancy').catch(() => ({ data: [] })),
    ]).then(([roomsRes, occRes]) => {
      const occMap: Record<string, number> = {};
      for (const o of occRes.data as Room[]) occMap[o.id] = o.currentCount ?? 0;
      setRooms(roomsRes.data.map((r: Room) => ({ ...r, currentCount: occMap[r.id] ?? 0 })));
    }).finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  async function create() {
    if (!name.trim() || !capacity) { Alert.alert('Preencha nome e capacidade'); return; }
    setSaving(true);
    try {
      const res = await api.post('/rooms', { name: name.trim(), capacity: Number(capacity) });
      setRooms((prev) => [...prev, { ...res.data, currentCount: 0 }]);
      setCreating(false); setName(''); setCapacity('');
    } catch { Alert.alert('Erro', 'Não foi possível criar a sala'); }
    setSaving(false);
  }

  async function remove(id: string) {
    Alert.alert('Excluir sala', 'Deseja excluir esta sala?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Excluir', style: 'destructive', onPress: async () => {
          await api.delete(`/rooms/${id}`);
          setRooms((prev) => prev.filter((r) => r.id !== id));
        },
      },
    ]);
  }

  function barColor(cur: number, cap: number) {
    const p = cap ? cur / cap : 0;
    if (p >= 1) return colors.danger;
    if (p >= 0.75) return colors.warning;
    return colors.success;
  }

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.header}>
        <Text style={s.title}>Salas</Text>
        <TouchableOpacity onPress={() => setCreating(!creating)} style={s.addBtn}>
          <Text style={s.addBtnText}>{creating ? '✕ Cancelar' : '+ Nova sala'}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={s.content}>
        {creating && (
          <Card style={{ marginBottom: 16 }}>
            <Text style={s.formTitle}>Nova sala</Text>
            <Text style={s.label}>Nome</Text>
            <TextInput style={s.input} value={name} onChangeText={setName} placeholder="Ex: Sala A" />
            <Text style={s.label}>Capacidade</Text>
            <TextInput style={s.input} value={capacity} onChangeText={setCapacity} placeholder="Ex: 6" keyboardType="number-pad" />
            <Button label={saving ? 'Criando...' : 'Criar sala'} onPress={create} loading={saving} style={{ marginTop: 12 }} />
          </Card>
        )}

        {loading
          ? [1, 2, 3].map((i) => <SkeletonCard key={i} height={100} />)
          : rooms.length === 0
            ? <EmptyState icon="🏫" message="Nenhuma sala cadastrada" />
            : rooms.map((room) => {
                const cur = room.currentCount ?? 0;
                const cap = room.capacity;
                const p = cap ? Math.min(100, Math.round((cur / cap) * 100)) : 0;
                const color = barColor(cur, cap);
                return (
                  <Card key={room.id} style={{ marginBottom: 10 }}>
                    <View style={s.roomRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={s.roomName}>{room.name}</Text>
                        <Text style={s.roomCap}>Capacidade: {cap}</Text>
                      </View>
                      <View style={{ alignItems: 'flex-end', gap: 6 }}>
                        <Text style={[s.occ, { color }]}>{cur}/{cap}</Text>
                        <TouchableOpacity onPress={() => remove(room.id)}>
                          <Text style={s.del}>🗑</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                    <View style={s.barBg}>
                      <View style={[s.barFill, { width: `${p}%` as any, backgroundColor: color }]} />
                    </View>
                    <Text style={s.pct}>{p}% ocupado</Text>
                  </Card>
                );
              })
        }
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderColor: colors.border },
  title: { fontSize: 20, fontWeight: '700', color: colors.text },
  addBtn: { backgroundColor: colors.primary, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 },
  addBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  content: { padding: 16, paddingBottom: 40 },
  formTitle: { fontSize: 15, fontWeight: '700', color: colors.text, marginBottom: 10 },
  label: { fontSize: 12, color: colors.muted, fontWeight: '600', marginBottom: 4, marginTop: 8 },
  input: { backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: colors.border, borderRadius: 8, padding: 10, fontSize: 14, color: colors.text },
  roomRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  roomName: { fontSize: 16, fontWeight: '700', color: colors.text },
  roomCap: { fontSize: 12, color: colors.muted, marginTop: 2 },
  occ: { fontSize: 18, fontWeight: '800' },
  del: { fontSize: 16 },
  barBg: { height: 8, backgroundColor: '#E5E7EB', borderRadius: 4, overflow: 'hidden', marginTop: 10 },
  barFill: { height: 8, borderRadius: 4 },
  pct: { fontSize: 11, color: colors.muted, marginTop: 4 },
});
