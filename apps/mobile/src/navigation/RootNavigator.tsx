import React, { createContext, useContext, useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { getAccessToken, getUser, clearAuth } from '../../lib/auth';
import { setSessionExpiredHandler } from '../../lib/api';
import { AppSplashScreen, colors } from '../../components/ui';
import { AuthNavigator } from './AuthNavigator';
import { StudentNavigator } from './StudentNavigator';
import { GuardianNavigator } from './GuardianNavigator';
import { TeacherNavigator } from './TeacherNavigator';
import { AdminNavigator } from './AdminNavigator';

export type UserRole = 'tenant_admin' | 'teacher' | 'student' | 'guardian';

interface AuthContextValue {
  role: UserRole | null;
  signIn: (role: UserRole) => void;
  signOut: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue>({
  role: null,
  signIn: () => {},
  signOut: async () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}

export type RootStackParamList = {
  Auth: undefined;
  StudentApp: undefined;
  GuardianApp: undefined;
  TeacherApp: undefined;
  AdminApp: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  const [authReady, setAuthReady]   = useState(false);
  const [splashDone, setSplashDone] = useState(false);
  const [role, setRole]             = useState<UserRole | null>(null);

  useEffect(() => {
    (async () => {
      const [token, user] = await Promise.all([
        getAccessToken(),
        getUser<{ role: UserRole }>(),
      ]);
      if (token && user) setRole(user.role);
      setAuthReady(true);
    })();
  }, []);

  const signIn = (r: UserRole) => setRole(r);
  const signOut = async () => {
    await clearAuth();
    setRole(null);
  };

  useEffect(() => {
    setSessionExpiredHandler(() => { clearAuth(); setRole(null); });
  }, []);

  if (!splashDone) {
    return <AppSplashScreen onDone={() => setSplashDone(true)} />;
  }

  if (!authReady) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F9FAFB' }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <AuthContext.Provider value={{ role, signIn, signOut }}>
      <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          {role === null ? (
            <Stack.Screen name="Auth" component={AuthNavigator} />
          ) : role === 'student' ? (
            <Stack.Screen name="StudentApp" component={StudentNavigator} />
          ) : role === 'guardian' ? (
            <Stack.Screen name="GuardianApp" component={GuardianNavigator} />
          ) : role === 'teacher' ? (
            <Stack.Screen name="TeacherApp" component={TeacherNavigator} />
          ) : (
            <Stack.Screen name="AdminApp" component={AdminNavigator} />
          )}
        </Stack.Navigator>
      </NavigationContainer>
    </AuthContext.Provider>
  );
}
