import { Tabs } from 'expo-router';
import { Text } from 'react-native';

const icon = (e: string) => ({ tabBarIcon: () => <Text style={{ fontSize: 20 }}>{e}</Text> });

export default function StudentLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false, tabBarActiveTintColor: '#2563EB' }}>
      <Tabs.Screen name="home"              options={{ title: 'Início',   ...icon('🏠') }} />
      <Tabs.Screen name="tasks/index"       options={{ title: 'Tarefas',  ...icon('📋') }} />
      <Tabs.Screen name="study-log/index"   options={{ title: 'Estudo',   ...icon('📖') }} />
      <Tabs.Screen name="activity/index"    options={{ title: 'Atividade',...icon('📷') }} />
      <Tabs.Screen name="progress/index"    options={{ title: 'Evolução', ...icon('📈') }} />
      <Tabs.Screen name="notifications"     options={{ title: 'Avisos',   ...icon('🔔') }} />
    </Tabs>
  );
}
