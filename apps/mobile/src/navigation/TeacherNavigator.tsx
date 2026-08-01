import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { AttendanceScreen } from '../screens/teacher/AttendanceScreen';
import { NotesScreen } from '../screens/teacher/NotesScreen';
import { TasksScreen } from '../screens/teacher/TasksScreen';
import { RoomScreen } from '../screens/teacher/RoomScreen';
import { NotificationsScreen } from '../screens/teacher/NotificationsScreen';

const Tab = createBottomTabNavigator();

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

const ICONS: Record<string, [IoniconName, IoniconName]> = {
  Presença:  ['people-outline',          'people'],
  Notas:     ['document-text-outline',   'document-text'],
  Tarefas:   ['checkbox-outline',        'checkbox'],
  Salas:     ['school-outline',          'school'],
  Avisos:    ['notifications-outline',   'notifications'],
};

export function TeacherNavigator() {
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
      <Tab.Screen name="Presença" component={AttendanceScreen} />
      <Tab.Screen name="Notas"    component={NotesScreen} />
      <Tab.Screen name="Tarefas"  component={TasksScreen} />
      <Tab.Screen name="Salas"    component={RoomScreen} />
      <Tab.Screen name="Avisos"   component={NotificationsScreen} />
    </Tab.Navigator>
  );
}
