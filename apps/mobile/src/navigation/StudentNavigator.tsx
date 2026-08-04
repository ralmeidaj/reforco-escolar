import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { withAlpha } from '../../lib/tabColors';
import { HomeScreen } from '../screens/student/HomeScreen';
import { TasksScreen } from '../screens/student/TasksScreen';
import { StudyLogScreen } from '../screens/student/StudyLogScreen';
import { ActivityScreen } from '../screens/student/ActivityScreen';
import { ProgressScreen } from '../screens/student/ProgressScreen';
import { RoomCheckinScreen } from '../screens/student/RoomCheckinScreen';
import { NotificationsScreen } from '../screens/student/NotificationsScreen';
import { ProfileScreen } from '../screens/shared/ProfileScreen';

const Tab = createBottomTabNavigator();

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

const ICONS: Record<string, [IoniconName, IoniconName]> = {
  Início:    ['home-outline',             'home'],
  Salas:     ['enter-outline',            'enter'],
  Tarefas:   ['checkmark-circle-outline', 'checkmark-circle'],
  Estudo:    ['book-outline',             'book'],
  Atividade: ['camera-outline',           'camera'],
  Evolução:  ['trending-up-outline',      'trending-up'],
  Avisos:    ['notifications-outline',    'notifications'],
  Perfil:    ['person-circle-outline',    'person-circle'],
};

const TAB_COLORS: Record<string, string> = {
  Início:    '#2563EB',
  Salas:     '#0D9488',
  Tarefas:   '#D97706',
  Estudo:    '#6366F1',
  Atividade: '#DB2777',
  Evolução:  '#16A34A',
  Avisos:    '#DC2626',
  Perfil:    '#0EA5E9',
};

export function StudentNavigator() {
  return (
    <Tab.Navigator screenOptions={({ route }) => {
      const active = TAB_COLORS[route.name] ?? '#2563EB';
      return {
        headerShown: false,
        tabBarActiveTintColor: active,
        tabBarInactiveTintColor: withAlpha(active, 0.45),
        tabBarIcon: ({ focused, color, size }) => {
          const [outline, filled] = ICONS[route.name] ?? ['ellipse-outline', 'ellipse'];
          return <Ionicons name={focused ? filled : outline} size={size} color={color} />;
        },
      };
    }}>
      <Tab.Screen name="Início"    component={HomeScreen} />
      <Tab.Screen name="Salas"     component={RoomCheckinScreen} />
      <Tab.Screen name="Tarefas"   component={TasksScreen} />
      <Tab.Screen name="Estudo"    component={StudyLogScreen} />
      <Tab.Screen name="Atividade" component={ActivityScreen} />
      <Tab.Screen name="Evolução"  component={ProgressScreen} />
      <Tab.Screen name="Avisos"    component={NotificationsScreen} />
      <Tab.Screen name="Perfil"    component={ProfileScreen} />
    </Tab.Navigator>
  );
}
