import { Tabs } from 'expo-router';
import { Text } from 'react-native';

const icon = (e: string) => ({ tabBarIcon: () => <Text style={{ fontSize: 20 }}>{e}</Text> });

export default function AdminLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false, tabBarActiveTintColor: '#2563EB' }}>
      <Tabs.Screen name="dashboard/index" options={{ title: 'Painel',  ...icon('📊') }} />
      <Tabs.Screen name="rooms/index"     options={{ title: 'Salas',   ...icon('🏫') }} />
      <Tabs.Screen name="notifications"   options={{ title: 'Avisos',  ...icon('🔔') }} />
    </Tabs>
  );
}
