import * as SecureStore from 'expo-secure-store';

const KEYS = {
  ACCESS_TOKEN: 'access_token',
  REFRESH_TOKEN: 'refresh_token',
  USER: 'user_data',
  TENANT_SLUG: 'tenant_slug',
};

export async function saveTokens(accessToken: string, refreshToken: string) {
  await Promise.all([
    SecureStore.setItemAsync(KEYS.ACCESS_TOKEN, accessToken),
    SecureStore.setItemAsync(KEYS.REFRESH_TOKEN, refreshToken),
  ]);
}

export async function getAccessToken() {
  return SecureStore.getItemAsync(KEYS.ACCESS_TOKEN);
}

export async function getRefreshToken() {
  return SecureStore.getItemAsync(KEYS.REFRESH_TOKEN);
}

export async function saveTenantSlug(slug: string) {
  return SecureStore.setItemAsync(KEYS.TENANT_SLUG, slug);
}

export async function getTenantSlug() {
  return SecureStore.getItemAsync(KEYS.TENANT_SLUG);
}

export async function saveUser(user: object) {
  return SecureStore.setItemAsync(KEYS.USER, JSON.stringify(user));
}

export async function getUser<T = any>(): Promise<T | null> {
  const raw = await SecureStore.getItemAsync(KEYS.USER);
  return raw ? (JSON.parse(raw) as T) : null;
}

export async function clearAuth() {
  await Promise.all([
    SecureStore.deleteItemAsync(KEYS.ACCESS_TOKEN),
    SecureStore.deleteItemAsync(KEYS.REFRESH_TOKEN),
    SecureStore.deleteItemAsync(KEYS.USER),
    SecureStore.deleteItemAsync(KEYS.TENANT_SLUG),
  ]);
}
