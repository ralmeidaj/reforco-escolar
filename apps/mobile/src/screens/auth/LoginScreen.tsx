import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ActivityIndicator,
  KeyboardAvoidingView, Platform, StyleSheet, FlatList,
} from 'react-native';
import axios from 'axios';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { saveTenantSlug, saveTokens, saveUser } from '../../../lib/auth';
import { useAuth, UserRole } from '../../navigation/RootNavigator';
import { AppLogo } from '../../../components/ui';

const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000';

async function registerPushToken(accessToken: string, slug: string) {
  try {
    const { status } = await Notifications.requestPermissionsAsync();
    if (status !== 'granted') return;
    const projectId = Constants.expoConfig?.extra?.eas?.projectId as string | undefined;
    const tokenData = await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : undefined);
    await axios.post(
      `${BASE_URL}/users/push-token`,
      { token: tokenData.data },
      { headers: { Authorization: `Bearer ${accessToken}`, 'X-Tenant-Slug': slug } },
    );
  } catch {}
}

interface TenantOption { slug: string; name: string }

export function LoginScreen() {
  const { signIn } = useAuth();
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);

  // Passo de seleção de escola (e-mail em múltiplos tenants)
  const [tenantOptions, setTenantOptions] = useState<TenantOption[]>([]);

  async function handleLogin() {
    if (!email.trim() || !password.trim()) {
      setError('Preencha e-mail e senha');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const { data } = await axios.post(`${BASE_URL}/auth/login/mobile`, { email, password });

      if (data.requireTenantSelection) {
        setTenantOptions(data.tenants);
        setLoading(false);
        return;
      }

      await finalize(data.accessToken, data.refreshToken, data.tenantSlug, data.user);
    } catch (err: any) {
      setError(err.response?.data?.message ?? 'E-mail ou senha incorretos');
    } finally {
      setLoading(false);
    }
  }

  async function handleSelectTenant(slug: string) {
    setLoading(true);
    setError('');
    try {
      const { data } = await axios.post(
        `${BASE_URL}/auth/login`,
        { email, password },
        { headers: { 'X-Tenant-Slug': slug } },
      );
      await finalize(data.accessToken, data.refreshToken, slug, data.user);
    } catch (err: any) {
      setError(err.response?.data?.message ?? 'Erro ao entrar na escola');
      setTenantOptions([]);
    } finally {
      setLoading(false);
    }
  }

  async function finalize(accessToken: string, refreshToken: string, slug: string, user: any) {
    await Promise.all([
      saveTenantSlug(slug),
      saveTokens(accessToken, refreshToken),
      saveUser(user),
    ]);
    registerPushToken(accessToken, slug);
    signIn(user.role as UserRole);
  }

  // Tela de seleção de escola
  if (tenantOptions.length > 0) {
    return (
      <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={styles.card}>
          <Text style={styles.title}>Escolha a escola</Text>
          <Text style={styles.subtitle}>Seu e-mail está associado a mais de uma escola</Text>

          <FlatList
            data={tenantOptions}
            keyExtractor={(item) => item.slug}
            renderItem={({ item }) => (
              <TouchableOpacity style={styles.schoolItem} onPress={() => handleSelectTenant(item.slug)} disabled={loading}>
                <Text style={styles.schoolName}>{item.name}</Text>
                <Text style={styles.schoolSlug}>{item.slug}</Text>
              </TouchableOpacity>
            )}
          />

          {error ? <Text style={styles.error}>{error}</Text> : null}
          {loading && <ActivityIndicator color="#2563EB" style={{ marginTop: 12 }} />}

          <TouchableOpacity onPress={() => setTenantOptions([])} style={{ marginTop: 16, alignItems: 'center' }}>
            <Text style={{ color: '#6B7280', fontSize: 13 }}>← Voltar</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.card}>
        <View style={{ marginBottom: 24 }}>
          <AppLogo size="lg" />
        </View>
        <Text style={styles.subtitle}>Faça login na sua conta</Text>

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
          {loading
            ? <ActivityIndicator color="#fff" size="small" />
            : <Text style={styles.buttonText}>Entrar</Text>}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container:    { flex: 1, backgroundColor: '#F9FAFB', alignItems: 'center', justifyContent: 'center', padding: 24 },
  card:         { width: '100%', maxWidth: 400, backgroundColor: '#fff', borderRadius: 16, padding: 32, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 4 },
  title:        { fontSize: 22, fontWeight: '700', color: '#111827', marginBottom: 4 },
  subtitle:     { fontSize: 14, color: '#6B7280', marginBottom: 24 },
  field:        { marginBottom: 16 },
  label:        { fontSize: 13, fontWeight: '500', color: '#374151', marginBottom: 6 },
  input:        { borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: '#111827', backgroundColor: '#fff' },
  error:        { fontSize: 13, color: '#DC2626', backgroundColor: '#FEF2F2', borderRadius: 8, padding: 10, marginBottom: 12 },
  button:       { backgroundColor: '#2563EB', borderRadius: 8, paddingVertical: 12, alignItems: 'center', marginTop: 4 },
  buttonDisabled: { opacity: 0.6 },
  buttonText:   { color: '#fff', fontWeight: '600', fontSize: 14 },
  schoolItem:   { borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 10, padding: 14, marginBottom: 10 },
  schoolName:   { fontSize: 15, fontWeight: '600', color: '#111827' },
  schoolSlug:   { fontSize: 12, color: '#9CA3AF', marginTop: 2 },
});
