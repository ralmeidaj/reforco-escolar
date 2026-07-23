import { Tabs } from 'expo-router';
import { Text } from 'react-native';

const icon = (e: string) => ({ tabBarIcon: () => <Text style={{ fontSize: 20 }}>{e}</Text> });

export default function GuardianLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false, tabBarActiveTintColor: '#2563EB' }}>
      <Tabs.Screen name="home"             options={{ title: 'Início',     ...icon('🏠') }} />
      <Tabs.Screen name="attendance/index" options={{ title: 'Frequência', ...icon('📅') }} />
      <Tabs.Screen name="tasks/index"      options={{ title: 'Tarefas',    ...icon('📋') }} />
      <Tabs.Screen name="progress/index"   options={{ title: 'Evolução',   ...icon('📈') }} />
      <Tabs.Screen name="finance/index"    options={{ title: 'Financeiro', ...icon('💳') }} />
      <Tabs.Screen name="chat/index"       options={{ title: 'Chat',       ...icon('💬') }} />
      <Tabs.Screen name="notifications"    options={{ title: 'Avisos',     ...icon('🔔') }} />
    </Tabs>
  );
}
