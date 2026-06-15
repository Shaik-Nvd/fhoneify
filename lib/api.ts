import axios, { AxiosInstance, AxiosError } from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

function getAccessToken(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem('fhoneify-auth');
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed?.state?.accessToken ?? null;
  } catch {
    return null;
  }
}

const api: AxiosInstance = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401 && typeof window !== 'undefined') {
      const configUrl = error.config?.url || '';
      const path = window.location.pathname;
      
      // Do not globally redirect if it's an OTP error (like "Invalid OTP") or if we are on the Quote page (which has its own modal)
      if (!configUrl.includes('/api/auth/otp') && !path.startsWith('/auth') && !path.startsWith('/quote')) {
        window.location.href = '/auth';
      }
    }
    return Promise.reject(error);
  }
);

export { api };
export default api;
