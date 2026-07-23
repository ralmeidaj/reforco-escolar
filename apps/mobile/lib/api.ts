import axios, { AxiosError } from 'axios';
import { getAccessToken, getRefreshToken, getTenantSlug, saveTokens, clearAuth } from './auth';

const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000';

export const api = axios.create({ baseURL: BASE_URL });

api.interceptors.request.use(async (config) => {
  const [token, slug] = await Promise.all([getAccessToken(), getTenantSlug()]);
  if (token) config.headers['Authorization'] = `Bearer ${token}`;
  if (slug) config.headers['X-Tenant-Slug'] = slug;
  return config;
});

let refreshing: Promise<string> | null = null;

api.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const original = error.config as any;
    if (error.response?.status !== 401 || original._retry) {
      return Promise.reject(error);
    }
    original._retry = true;

    if (!refreshing) {
      refreshing = (async () => {
        const refreshToken = await getRefreshToken();
        const slug = await getTenantSlug();
        if (!refreshToken) {
          await clearAuth();
          throw new Error('Session expired');
        }
        const { data } = await axios.post(
          `${BASE_URL}/auth/refresh/mobile`,
          { refreshToken },
          { headers: { 'X-Tenant-Slug': slug ?? '' } },
        );
        await saveTokens(data.accessToken, data.refreshToken);
        return data.accessToken as string;
      })().finally(() => {
        refreshing = null;
      });
    }

    const newToken = await refreshing;
    original.headers['Authorization'] = `Bearer ${newToken}`;
    return api(original);
  },
);
