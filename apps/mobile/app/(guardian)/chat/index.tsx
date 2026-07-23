import { useEffect, useRef, useState } from 'react';
import { View, Text, FlatList, TextInput, TouchableOpacity, StyleSheet, SafeAreaView, KeyboardAvoidingView, Platform } from 'react-native';
import { api } from '../../../lib/api';
import { getUser } from '../../../lib/auth';
import { colors } from '../../../components/ui';

interface Message { id: string; fromId: string; body: string; createdAt: string; readAt: string | null; }
interface Contact { id: string; name: string; role: string; }

export default function GuardianChat() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [selected, setSelected] = useState<Contact | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState('');
  const [myId, setMyId] = useState('');
  const [sending, setSending] = useState(false);
  const listRef = useRef<FlatList>(null);

  useEffect(() => {
    (async () => {
      const user = await getUser<{ id: string }>();
      setMyId(user?.id ?? '');
      const res = await api.get('/messages/contacts');
      setContacts(res.data);
      if (res.data.length === 1) setSelected(res.data[0]);
    })();
  }, []);

  useEffect(() => {
    if (!selected) return;
    api.get(`/messages/${selected.id}`).then((r) => setMessages(r.data));
  }, [selected]);

  async function send() {
    if (!text.trim() || !selected) return;
    setSending(true);
    try {
      const res = await api.post('/messages', { toId: selected.id, body: text.trim() });
      setMessages((prev) => [...prev, res.data]);
      setText('');
      setTimeout(() => listRef.current?.scrollToEnd(), 100);
    } catch {}
    setSending(false);
  }

  if (!selected) {
    return (
      <SafeAreaView style={s.safe}>
        <View style={s.header}><Text style={s.title}>Chat</Text></View>
        {contacts.length === 0
          ? <View style={s.empty}><Text style={s.emptyText}>Nenhum professor disponível para chat</Text></View>
          : contacts.map((c) => (
              <TouchableOpacity key={c.id} onPress={() => setSelected(c)} style={s.contactRow}>
                <View style={s.avatar}><Text style={s.avatarText}>{c.name[0]}</Text></View>
                <View>
                  <Text style={s.contactName}>{c.name}</Text>
                  <Text style={s.contactRole}>Professor</Text>
                </View>
              </TouchableOpacity>
            ))
        }
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => setSelected(null)} style={{ marginRight: 12 }}>
          <Text style={s.back}>←</Text>
        </TouchableOpacity>
        <View style={s.avatar}><Text style={s.avatarText}>{selected.name[0]}</Text></View>
        <Text style={s.title}>{selected.name}</Text>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={90}>
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(m) => m.id}
          contentContainerStyle={s.msgList}
          onLayout={() => listRef.current?.scrollToEnd()}
          renderItem={({ item: m }) => {
            const mine = m.fromId === myId;
            return (
              <View style={[msgS.bubble, mine ? msgS.mine : msgS.theirs]}>
                <Text style={[msgS.body, mine ? msgS.mineText : msgS.theirsText]}>{m.body}</Text>
                <Text style={[msgS.time, mine ? msgS.mineText : msgS.theirsText]}>
                  {new Date(m.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                </Text>
              </View>
            );
          }}
        />
        <View style={s.inputRow}>
          <TextInput
            style={s.input}
            value={text}
            onChangeText={setText}
            placeholder="Digite uma mensagem..."
            multiline
            maxLength={500}
          />
          <TouchableOpacity onPress={send} disabled={sending || !text.trim()} style={[s.sendBtn, (!text.trim() || sending) && { opacity: 0.5 }]}>
            <Text style={s.sendText}>➤</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: 'row', alignItems: 'center', padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderColor: colors.border },
  title: { fontSize: 16, fontWeight: '700', color: colors.text, flex: 1 },
  back: { fontSize: 22, color: colors.primary },
  avatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#DBEAFE', alignItems: 'center', justifyContent: 'center', marginRight: 8 },
  avatarText: { fontSize: 16, fontWeight: '700', color: colors.primary },
  msgList: { padding: 16, paddingBottom: 8 },
  inputRow: { flexDirection: 'row', alignItems: 'flex-end', padding: 12, backgroundColor: '#fff', borderTopWidth: 1, borderColor: colors.border, gap: 8 },
  input: { flex: 1, borderWidth: 1, borderColor: colors.border, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, fontSize: 14, maxHeight: 100 },
  sendBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  sendText: { color: '#fff', fontSize: 16 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyText: { color: colors.muted, fontSize: 14 },
  contactRow: { flexDirection: 'row', alignItems: 'center', padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderColor: colors.border, gap: 12 },
  contactName: { fontSize: 15, fontWeight: '600', color: colors.text },
  contactRole: { fontSize: 12, color: colors.muted },
});
const msgS = StyleSheet.create({
  bubble: { maxWidth: '80%', borderRadius: 16, padding: 10, marginBottom: 8 },
  mine: { alignSelf: 'flex-end', backgroundColor: colors.primary, borderBottomRightRadius: 4 },
  theirs: { alignSelf: 'flex-start', backgroundColor: '#fff', borderBottomLeftRadius: 4, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
  body: { fontSize: 14 },
  time: { fontSize: 10, marginTop: 2, opacity: 0.7, textAlign: 'right' },
  mineText: { color: '#fff' },
  theirsText: { color: colors.text },
});
