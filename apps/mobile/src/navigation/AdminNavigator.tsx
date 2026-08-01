import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { DashboardScreen } from '../screens/admin/DashboardScreen';
import { RoomsScreen } from '../screens/admin/RoomsScreen';
import { NotificationsScreen } from '../screens/admin/NotificationsScreen';

const Tab = createBottomTabNavigator();

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

const ICONS: Record<string, [IoniconName, IoniconName]> = {
  Dashboard: ['stats-chart-outline',    'stats-chart'],
  Salas:     ['business-outline',       'business'],
  Avisos:    ['notifications-outline',  'notifications'],
};

export function AdminNavigator() {
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
      <Tab.Screen name="Dashboard" component={DashboardScreen} />
      <Tab.Screen name="Salas"     component={RoomsScreen} />
      <Tab.Screen name="Avisos"    component={NotificationsScreen} />
    </Tab.Navigator>
  );
}
