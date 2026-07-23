import { Tabs } from 'expo-router';
import { Text } from 'react-native';

const icon = (e: string) => ({ tabBarIcon: () => <Text style={{ fontSize: 20 }}>{e}</Text> });

export default function TeacherLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false, tabBarActiveTintColor: '#2563EB' }}>
      <Tabs.Screen name="attendance/index" options={{ title: 'Presença',  ...icon('✅') }} />
      <Tabs.Screen name="notes/index"      options={{ title: 'Notas',     ...icon('📝') }} />
      <Tabs.Screen name="tasks/index"      options={{ title: 'Tarefas',   ...icon('📋') }} />
      <Tabs.Screen name="room/index"       options={{ title: 'Salas',     ...icon('🏫') }} />
      <Tabs.Screen name="notifications"    options={{ title: 'Avisos',    ...icon('🔔') }} />
    </Tabs>
  );
}
