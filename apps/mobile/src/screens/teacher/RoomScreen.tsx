import { useCallback, useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '../../../lib/api';
import { Card, SkeletonCard, EmptyState, colors } from '../../../components/ui';

interface Assignment {
  id: string;
  teacher: { id: string; name: string };
  subject: { id: string; name: string } | null;
}

interface Room {
  id: string;
  name: string;
  capacity: number;
  currentOccupancy: number;
  assignments: Assignment[];
}

interface ActiveCheckin {
  checkinId: string;
  studentId: string;
  studentName: string;
  roomId: string;
}

export function RoomScreen() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [studentsByRoom, setStudentsByRoom] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    Promise.all([
      api.get<Room[]>('/rooms/mine'),
      api.get<Room[]>('/rooms/occupancy'),
      api.get<ActiveCheckin[]>('/rooms/checkins/active'),
    ])
      .then(([mine, occupancy, checkins]) => {
        const occupancyMap = new Map(occupancy.data.map((r) => [r.id, r.currentOccupancy]));
        setRooms(mine.data.map((r) => ({ ...r, currentOccupancy: occupancyMap.get(r.id) ?? 0 })));

        const byRoom: Record<string, string[]> = {};
        for (const c of checkins.data) {
          (byRoom[c.roomId] ??= []).push(c.studentName);
        }
        setStudentsByRoom(byRoom);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(load, 30_000);
    return () => clearInterval(interval);
  }, [load]);

  function pct(room: Room) {
    if (!room.capacity) return 0;
    return Math.min(100, Math.round((room.currentOccupancy / room.capacity) * 100));
  }

  function barColor(p: number) {
    if (p >= 100) return colors.danger;
    if (p >= 75) return colors.warning;
    return colors.success;
  }

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.header}>
        <Text style={s.title}>Minha Sala</Text>
        <TouchableOpacity onPress={load} style={s.refreshBtn}>
          <Text style={s.refreshText}>↻ Atualizar</Text>
        </TouchableOpacity>
      </View>
      <ScrollView contentContainerStyle={s.content}>
        {loading
          ? [1, 2, 3].map((i) => <SkeletonCard key={i} height={110} />)
          : rooms.length === 0
            ? <EmptyState icon="🏫" message="Você ainda não está alocado em nenhuma sala. Fale com a coordenação." />
            : rooms.map((room) => {
                const p = pct(room);
                const color = barColor(p);
                const subjects = room.assignments.filter((a) => a.subject).map((a) => a.subject!.name);
                const students = studentsByRoom[room.id] ?? [];
                return (
                  <Card key={room.id} style={{ marginBottom: 12 }}>
                    <View style={s.roomHeader}>
                      <View style={{ flex: 1 }}>
                        <Text style={s.roomName}>{room.name}</Text>
                        {subjects.length > 0 && (
                          <Text style={s.roomMeta}>{subjects.join(', ')}</Text>
                        )}
                      </View>
                      <Text style={[s.count, { color }]}>{room.currentOccupancy}/{room.capacity}</Text>
                    </View>
                    <View style={s.barBg}>
                      <View style={[s.barFill, { width: `${p}%` as any, backgroundColor: color }]} />
                    </View>
                    <Text style={s.pct}>{p}% ocupado</Text>
                    {students.length > 0 && (
                      <View style={s.studentList}>
                        {students.map((name) => (
                          <View key={name} style={s.studentTag}>
                            <Text style={s.studentTagText}>{name}</Text>
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
  roomMeta: { fontSize: 12, color: colors.primary, marginTop: 2 },
  count: { fontSize: 18, fontWeight: '800' },
  barBg: { height: 8, backgroundColor: '#E5E7EB', borderRadius: 4, overflow: 'hidden' },
  barFill: { height: 8, borderRadius: 4 },
  pct: { fontSize: 11, color: colors.muted, marginTop: 4 },
  studentList: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 },
  studentTag: { backgroundColor: '#EFF6FF', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  studentTagText: { fontSize: 12, color: colors.primary, fontWeight: '500' },
});
