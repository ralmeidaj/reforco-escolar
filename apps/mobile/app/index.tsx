import { useEffect } from 'react';
import { router } from 'expo-router';
import { getAccessToken, getUser } from '../lib/auth';
import { View, ActivityIndicator } from 'react-native';

type UserRole = 'tenant_admin' | 'teacher' | 'student' | 'guardian';

const ROLE_ROUTES: Record<UserRole, string> = {
  tenant_admin: '/(admin)/dashboard',
  teacher: '/(teacher)/attendance',
  student: '/(student)/home',
  guardian: '/(guardian)/home',
};

export default function Index() {
  useEffect(() => {
    async function check() {
      const [token, user] = await Promise.all([getAccessToken(), getUser<{ role: UserRole }>()]);
      if (!token || !user) {
        router.replace('/(auth)/login');
      } else {
        router.replace(ROLE_ROUTES[user.role] ?? '/(auth)/login');
      }
    }
    check();
  }, []);

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <ActivityIndicator size="large" color="#2563EB" />
    </View>
  );
}
