import axios, { AxiosError } from 'axios';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';

const saApi = axios.create({
  baseURL: `${BASE_URL}/super-admin`,
  withCredentials: true,
});

saApi.interceptors.response.use(
  (res) => res,
  (error: AxiosError) => {
    if (error.response?.status === 401 && typeof window !== 'undefined') {
      window.location.href = '/super-admin/login';
    }
    return Promise.reject(error);
  },
);

export function setSaToken(token: string) {
  saApi.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  if (typeof window !== 'undefined') {
    sessionStorage.setItem('sa_token', token);
  }
}

export function loadSaToken() {
  if (typeof window !== 'undefined') {
    const t = sessionStorage.getItem('sa_token');
    if (t) saApi.defaults.headers.common['Authorization'] = `Bearer ${t}`;
  }
}

export { saApi };
