import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { HomeScreen } from '../screens/guardian/HomeScreen';
import { AttendanceScreen } from '../screens/guardian/AttendanceScreen';
import { TasksScreen } from '../screens/guardian/TasksScreen';
import { ProgressScreen } from '../screens/guardian/ProgressScreen';
import { FinanceScreen } from '../screens/guardian/FinanceScreen';
import { ChatScreen } from '../screens/guardian/ChatScreen';
import { NotificationsScreen } from '../screens/guardian/NotificationsScreen';
import { ProfileScreen } from '../screens/shared/ProfileScreen';

const Tab = createBottomTabNavigator();

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

const ICONS: Record<string, [IoniconName, IoniconName]> = {
  Início:     ['home-outline',           'home'],
  Frequência: ['calendar-outline',       'calendar'],
  Tarefas:    ['list-outline',           'list'],
  Evolução:   ['bar-chart-outline',      'bar-chart'],
  Financeiro: ['card-outline',           'card'],
  Chat:       ['chatbubbles-outline',    'chatbubbles'],
  Avisos:     ['notifications-outline',  'notifications'],
  Perfil:     ['person-circle-outline',  'person-circle'],
};

export function GuardianNavigator() {
  return (
    <Tab.Navigator screenOptions={({ route }) => ({
      headerShown: false,
      tabBarActiveTintColor: '#2563EB',
      tabBarInactiveTintColor: '#6B7280',
      tabBarIcon: ({ focused, color, size }) => {
        const [outline, filled] = ICONS[route.name] ?? ['ellipse-outline', 'ellipse'];
        return <Ionicons name={focused ? filled : outline} size={size} color={color} />;
      },
    })}>
      <Tab.Screen name="Início"     component={HomeScreen} />
      <Tab.Screen name="Frequência" component={AttendanceScreen} />
      <Tab.Screen name="Tarefas"    component={TasksScreen} />
      <Tab.Screen name="Evolução"   component={ProgressScreen} />
      <Tab.Screen name="Financeiro" component={FinanceScreen} />
      <Tab.Screen name="Chat"       component={ChatScreen} />
      <Tab.Screen name="Avisos"     component={NotificationsScreen} />
      <Tab.Screen name="Perfil"     component={ProfileScreen} />
    </Tab.Navigator>
  );
}
