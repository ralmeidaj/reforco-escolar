import { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, SafeAreaView, Alert, RefreshControl, ActivityIndicator } from 'react-native';
import { api } from '../../../lib/api';
import { Card, SkeletonCard, EmptyState, colors } from '../../../components/ui';

interface RoomAvailable {
  id: string;
  name: string;
  capacity: number;
  currentOccupancy: number;
  available: number;
  isFull: boolean;
}

interface ActiveCheckin {
  id: string;
  roomId: string;
  checkinAt: string;
  room: { id: string; name: string; capacity: number };
}

function OccupancyBar({ current, capacity, isFull }: { current: number; capacity: number; isFull: boolean }) {
  const pct = capacity ? Math.min(100, Math.round((current / capacity) * 100)) : 0;
  const color = isFull ? colors.danger : pct >= 75 ? colors.warning : colors.success;
  return (
    <View style={bar.bg}>
      <View style={[bar.fill, { width: `${pct}%` as any, backgroundColor: color }]} />
    </View>
  );
}

export function RoomCheckinScreen() {
  const [rooms, setRooms] = useState<RoomAvailable[]>([]);
  const [activeCheckin, setActiveCheckin] = useState<ActiveCheckin | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [checkingIn, setCheckingIn] = useState<string | null>(null);
  const [checkingOut, setCheckingOut] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = useCallback(async () => {
    try {
      const [roomsRes, checkinRes] = await Promise.all([
        api.get<RoomAvailable[]>('/rooms/available'),
        api.get<ActiveCheckin | null>('/rooms/my-checkin'),
      ]);
      setRooms(roomsRes.data);
      setActiveCheckin(checkinRes.data);
    } catch {}
  }, []);

  useEffect(() => {
    load().finally(() => setLoading(false));
    intervalRef.current = setInterval(load, 30_000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [load]);

  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  async function handleCheckin(room: RoomAvailable) {
    if (room.isFull) return;
    Alert.alert(
      'Entrar na sala',
      `Confirma que você vai entrar em "${room.name}"?\n${room.available} vaga(s) disponível(is).`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Entrar',
          onPress: async () => {
            setCheckingIn(room.id);
            try {
              await api.post(`/rooms/${room.id}/checkin`);
              await load();
            } catch (e: any) {
              Alert.alert('Erro', e.response?.data?.message ?? 'Não foi possível fazer o check-in');
            }
            setCheckingIn(null);
          },
        },
      ],
    );
  }

  async function handleCheckout() {
    Alert.alert(
      'Sair da sala',
      `Deseja sair de "${activeCheckin?.room.name}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Sair',
          style: 'destructive',
          onPress: async () => {
            setCheckingOut(true);
            try {
              await api.delete('/rooms/my-checkin');
              await load();
            } catch {}
            setCheckingOut(false);
          },
        },
      ],
    );
  }

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.header}>
        <Text style={s.title}>Salas de hoje</Text>
        <Text style={s.subtitle}>Escolha onde você vai estudar</Text>
      </View>

      <ScrollView
        contentContainerStyle={s.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {activeCheckin && (
          <View style={s.activeCard}>
            <View style={s.activeRow}>
              <View>
                <Text style={s.activeLabel}>Você está em</Text>
                <Text style={s.activeName}>{activeCheckin.room.name}</Text>
                <Text style={s.activeTime}>
                  Entrada: {new Date(activeCheckin.checkinAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                </Text>
              </View>
              <TouchableOpacity
                onPress={handleCheckout}
                disabled={checkingOut}
                style={[s.checkoutBtn, checkingOut && { opacity: 0.6 }]}
              >
                {checkingOut
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <Text style={s.checkoutText}>Sair da sala</Text>
                }
              </TouchableOpacity>
            </View>
          </View>
        )}

        {loading
          ? [1, 2, 3].map((i) => <SkeletonCard key={i} height={110} />)
          : rooms.length === 0
            ? <EmptyState icon="🏫" message="Nenhuma sala disponível hoje" />
            : rooms.map((room) => {
                const isMyRoom = activeCheckin?.roomId === room.id;
                const isLoading = checkingIn === room.id;
                return (
                  <Card key={room.id} style={[s.roomCard, isMyRoom && s.myRoom]}>
                    <View style={s.roomTop}>
                      <Text style={s.roomName}>{room.name}</Text>
                      <Text style={[s.spots, { color: room.isFull ? colors.danger : colors.success }]}>
                        {room.isFull ? 'Lotada' : `${room.available} vaga${room.available !== 1 ? 's' : ''}`}
                      </Text>
                    </View>

                    <OccupancyBar current={room.currentOccupancy} capacity={room.capacity} isFull={room.isFull} />

                    <View style={s.roomBottom}>
                      <Text style={s.occupancyText}>
                        {room.currentOccupancy}/{room.capacity} alunos
                      </Text>
                      {isMyRoom ? (
                        <View style={s.myRoomBadge}>
                          <Text style={s.myRoomText}>✓ Você está aqui</Text>
                        </View>
                      ) : (
                        <TouchableOpacity
                          onPress={() => handleCheckin(room)}
                          disabled={room.isFull || isLoading || !!checkingIn}
                          style={[
                            s.enterBtn,
                            (room.isFull || !!checkingIn) && s.enterBtnDisabled,
                          ]}
                        >
                          {isLoading
                            ? <ActivityIndicator color="#fff" size="small" />
                            : <Text style={s.enterBtnText}>{room.isFull ? 'Lotada' : 'Entrar'}</Text>
                          }
                        </TouchableOpacity>
                      )}
                    </View>
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
  header: { backgroundColor: '#fff', paddingHorizontal: 16, paddingTop: 16, paddingBottom: 12, borderBottomWidth: 1, borderColor: colors.border },
  title: { fontSize: 20, fontWeight: '700', color: colors.text },
  subtitle: { fontSize: 13, color: colors.muted, marginTop: 2 },
  content: { padding: 16, paddingBottom: 40 },

  activeCard: {
    backgroundColor: '#EFF6FF',
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  activeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  activeLabel: { fontSize: 12, color: colors.primary, fontWeight: '600', marginBottom: 2 },
  activeName: { fontSize: 18, fontWeight: '800', color: colors.text },
  activeTime: { fontSize: 12, color: colors.muted, marginTop: 2 },
  checkoutBtn: { backgroundColor: colors.danger, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8 },
  checkoutText: { color: '#fff', fontWeight: '700', fontSize: 13 },

  roomCard: { marginBottom: 12 },
  myRoom: { borderWidth: 2, borderColor: colors.primary },
  roomTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  roomName: { fontSize: 17, fontWeight: '700', color: colors.text },
  spots: { fontSize: 14, fontWeight: '700' },
  roomBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 },
  occupancyText: { fontSize: 12, color: colors.muted },
  enterBtn: { backgroundColor: colors.primary, borderRadius: 8, paddingHorizontal: 18, paddingVertical: 8, minWidth: 70, alignItems: 'center' },
  enterBtnDisabled: { backgroundColor: '#D1D5DB' },
  enterBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  myRoomBadge: { backgroundColor: '#DCFCE7', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 },
  myRoomText: { color: colors.success, fontWeight: '700', fontSize: 13 },
});

const bar = StyleSheet.create({
  bg: { height: 8, backgroundColor: '#E5E7EB', borderRadius: 4, overflow: 'hidden' },
  fill: { height: 8, borderRadius: 4 },
});
