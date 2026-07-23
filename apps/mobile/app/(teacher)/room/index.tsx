import { useCallback, useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, SafeAreaView, TouchableOpacity } from 'react-native';
import { api } from '../../../lib/api';
import { Card, SkeletonCard, EmptyState, colors } from '../../../components/ui';

interface RoomOccupancy {
  id: string;
  name: string;
  capacity: number;
  currentCount: number;
  students: { id: string; name: string }[];
}

export default function TeacherRoom() {
  const [rooms, setRooms] = useState<RoomOccupancy[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    api.get('/rooms/occupancy').then((r) => setRooms(r.data)).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(load, 30_000);
    return () => clearInterval(interval);
  }, [load]);

  function pct(room: RoomOccupancy) {
    if (!room.capacity) return 0;
    return Math.min(100, Math.round((room.currentCount / room.capacity) * 100));
  }

  function barColor(p: number) {
    if (p >= 100) return colors.danger;
    if (p >= 75) return colors.warning;
    return colors.success;
  }

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.header}>
        <Text style={s.title}>Ocupação das Salas</Text>
        <TouchableOpacity onPress={load} style={s.refreshBtn}>
          <Text style={s.refreshText}>↻ Atualizar</Text>
        </TouchableOpacity>
      </View>
      <ScrollView contentContainerStyle={s.content}>
        {loading
          ? [1, 2, 3].map((i) => <SkeletonCard key={i} height={110} />)
          : rooms.length === 0
            ? <EmptyState icon="🏫" message="Nenhuma sala cadastrada" />
            : rooms.map((room) => {
                const p = pct(room);
                const color = barColor(p);
                return (
                  <Card key={room.id} style={{ marginBottom: 12 }}>
                    <View style={s.roomHeader}>
                      <Text style={s.roomName}>{room.name}</Text>
                      <Text style={[s.count, { color }]}>
                        {room.currentCount}/{room.capacity}
                      </Text>
                    </View>
                    <View style={s.barBg}>
                      <View style={[s.barFill, { width: `${p}%` as any, backgroundColor: color }]} />
                    </View>
                    <Text style={s.pct}>{p}% ocupado</Text>
                    {room.students.length > 0 && (
                      <View style={s.studentList}>
                        {room.students.map((st) => (
                          <View key={st.id} style={s.studentTag}>
                            <Text style={s.studentTagText}>{st.name}</Text>
                          </View>
                        ))}
                      </View>
                    )}
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
  title: { fontSize: 18, fontWeight: '700', color: colors.text },
  refreshBtn: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, backgroundColor: '#EFF6FF' },
  refreshText: { color: colors.primary, fontWeight: '600', fontSize: 13 },
  content: { padding: 16, paddingBottom: 40 },
  roomHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  roomName: { fontSize: 16, fontWeight: '700', color: colors.text },
  count: { fontSize: 18, fontWeight: '800' },
  barBg: { height: 8, backgroundColor: '#E5E7EB', borderRadius: 4, overflow: 'hidden' },
  barFill: { height: 8, borderRadius: 4 },
  pct: { fontSize: 11, color: colors.muted, marginTop: 4 },
  studentList: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 },
  studentTag: { backgroundColor: '#EFF6FF', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  studentTagText: { fontSize: 12, color: colors.primary, fontWeight: '500' },
});
