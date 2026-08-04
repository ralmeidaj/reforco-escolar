import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { withAlpha } from '../../lib/tabColors';
import { DashboardScreen } from '../screens/admin/DashboardScreen';
import { RoomsScreen } from '../screens/admin/RoomsScreen';
import { RoomSchedulesScreen } from '../screens/admin/RoomSchedulesScreen';
import { NotificationsScreen } from '../screens/admin/NotificationsScreen';
import { ProfileScreen } from '../screens/shared/ProfileScreen';

const Tab = createBottomTabNavigator();

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

const ICONS: Record<string, [IoniconName, IoniconName]> = {
  Dashboard: ['stats-chart-outline',    'stats-chart'],
  Salas:     ['business-outline',       'business'],
  Horários:  ['calendar-outline',       'calendar'],
  Avisos:    ['notifications-outline',  'notifications'],
  Perfil:    ['person-circle-outline',  'person-circle'],
};

const TAB_COLORS: Record<string, string> = {
  Dashboard: '#6366F1',
  Salas:     '#D97706',
  Horários:  '#2563EB',
  Avisos:    '#DC2626',
  Perfil:    '#0EA5E9',
};

export function AdminNavigator() {
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
      <Tab.Screen name="Dashboard" component={DashboardScreen} />
      <Tab.Screen name="Salas"     component={RoomsScreen} />
      <Tab.Screen name="Horários"  component={RoomSchedulesScreen} />
      <Tab.Screen name="Avisos"    component={NotificationsScreen} />
      <Tab.Screen name="Perfil"    component={ProfileScreen} />
    </Tab.Navigator>
  );
}
