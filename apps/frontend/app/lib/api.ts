import axios, { AxiosError, AxiosInstance } from 'axios';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';

export function getTenantSlug(): string {
  if (typeof window !== 'undefined') {
    // Cookie tem prioridade — definido explicitamente pelo formulário de login/cadastro
    const match = document.cookie.match(/(?:^|;\s*)tenant_slug=([^;]+)/);
    if (match) return decodeURIComponent(match[1]);
    // Fallback: subdomínio (para quando cada tenant tiver domínio próprio)
    const host = window.location.hostname;
    const parts = host.split('.');
    if (parts.length >= 3) return parts[0];
  }
  return '';
}

export function setTenantSlug(slug: string) {
  document.cookie = `tenant_slug=${encodeURIComponent(slug)}; path=/; max-age=86400; SameSite=Lax`;
}

function createApiClient(): AxiosInstance {
  const client = axios.create({
    baseURL: BASE_URL,
    withCredentials: true,
  });

  // injeta X-Tenant-Slug em todas as requisições
  client.interceptors.request.use((config) => {
    const slug = getTenantSlug();
    if (slug) config.headers['X-Tenant-Slug'] = slug;
    return config;
  });

  let refreshing: Promise<string> | null = null;

  client.interceptors.response.use(
    (res) => res,
    async (error: AxiosError) => {
      const original = error.config as any;
      const isAuthEndpoint = original.url?.includes('/auth/login') || original.url?.includes('/auth/signup');
      if (error.response?.status !== 401 || original._retry || isAuthEndpoint) {
        return Promise.reject(error);
      }
      original._retry = true;

      if (!refreshing) {
        refreshing = axios
          .post('/api/auth/refresh', {}, { withCredentials: true })
          .then((r) => r.data.accessToken as string)
          .finally(() => {
            refreshing = null;
          });
      }

      await refreshing;
      return client(original);
    },
  );

  return client;
}

export const api = createApiClient();
