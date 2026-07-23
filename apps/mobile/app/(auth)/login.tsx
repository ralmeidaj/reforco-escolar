import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
} from 'react-native';
import { router } from 'expo-router';
import axios from 'axios';
import * as Notifications from 'expo-notifications';
import { saveTenantSlug, saveTokens, saveUser } from '../../lib/auth';

async function registerPushToken(accessToken: string, slug: string) {
  try {
    const { status } = await Notifications.requestPermissionsAsync();
    if (status !== 'granted') return;
    const tokenData = await Notifications.getExpoPushTokenAsync();
    await axios.post(
      `${process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000'}/users/push-token`,
      { token: tokenData.data },
      { headers: { Authorization: `Bearer ${accessToken}`, 'X-Tenant-Slug': slug } },
    );
  } catch {}
}

const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000';

type UserRole = 'tenant_admin' | 'teacher' | 'student' | 'guardian';

const ROLE_ROUTES: Record<UserRole, string> = {
  tenant_admin: '/(admin)/dashboard',
  teacher: '/(teacher)/attendance',
  student: '/(student)/home',
  guardian: '/(guardian)/home',
};

export default function LoginScreen() {
  const [slug, setSlug] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    if (!slug.trim() || !email.trim() || !password.trim()) {
      setError('Preencha todos os campos');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const { data } = await axios.post(
        `${BASE_URL}/auth/login`,
        { email, password },
        { headers: { 'X-Tenant-Slug': slug.trim() } },
      );
      await Promise.all([
        saveTenantSlug(slug.trim()),
        saveTokens(data.accessToken, data.refreshToken),
        saveUser(data.user),
      ]);
      registerPushToken(data.accessToken, slug.trim());
      router.replace(ROLE_ROUTES[data.user.role as UserRole] ?? '/(auth)/login');
    } catch (err: any) {
      setError(err.response?.data?.message ?? 'E-mail ou senha incorretos');
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.card}>
        <Text style={styles.title}>Reforços Escolares</Text>
        <Text style={styles.subtitle}>Faça login na sua escola</Text>

        <View style={styles.field}>
          <Text style={styles.label}>Código da escola</Text>
          <TextInput
            style={styles.input}
            value={slug}
            onChangeText={setSlug}
            placeholder="ex: escola-silva"
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>E-mail</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            placeholder="seu@email.com"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Senha</Text>
          <TextInput
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            placeholder="••••••••"
          />
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleLogin}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.buttonText}>Entrar</Text>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 32,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 24,
  },
  field: {
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#111827',
    backgroundColor: '#fff',
  },
  error: {
    fontSize: 13,
    color: '#DC2626',
    backgroundColor: '#FEF2F2',
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
  },
  button: {
    backgroundColor: '#2563EB',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 4,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
});
