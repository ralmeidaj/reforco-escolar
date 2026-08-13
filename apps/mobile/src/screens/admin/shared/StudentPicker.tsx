import { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { api } from '../../../../lib/api';
import { Card, SkeletonCard, EmptyState, colors } from '../../../../components/ui';

export interface StudentLite {
  id: string;
  name: string;
  email: string;
}

export function StudentPicker({ onSelect }: { onSelect: (student: StudentLite) => void }) {
  const [students, setStudents] = useState<StudentLite[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    api.get('/auth/users?role=student')
      .then((res) => setStudents(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = students.filter((st) =>
    st.name.toLowerCase().includes(search.toLowerCase()) ||
    st.email.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <View>
      <TextInput
        style={s.input}
        value={search}
        onChangeText={setSearch}
        placeholder="Buscar aluno..."
      />
      <View style={{ height: 12 }} />
      {loading
        ? [1, 2, 3].map((i) => <SkeletonCard key={i} height={56} />)
        : filtered.length === 0
          ? <EmptyState icon="🔎" message="Nenhum aluno encontrado" />
          : filtered.map((st) => (
              <TouchableOpacity key={st.id} onPress={() => onSelect(st)}>
                <Card style={{ marginBottom: 8 }}>
                  <Text style={s.name}>{st.name}</Text>
                  <Text style={s.email}>{st.email}</Text>
                </Card>
              </TouchableOpacity>
            ))
      }
    </View>
  );
}

const s = StyleSheet.create({
  input: { backgroundColor: '#fff', borderWidth: 1, borderColor: colors.border, borderRadius: 8, padding: 10, fontSize: 14, color: colors.text },
  name: { fontSize: 14, fontWeight: '600', color: colors.text },
  email: { fontSize: 12, color: colors.muted, marginTop: 2 },
});
