import axios from 'axios';

export const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000';

export const api = axios.create({ baseURL: `${API_BASE}/api` });

api.interceptors.request.use(config => {
  const token = localStorage.getItem('gb_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export function apiError(e: unknown): string {
  if (axios.isAxiosError(e)) {
    return e.response?.data?.error || e.message;
  }
  return 'केही त्रुटि भयो — पुनः प्रयास गर्नुहोस्';
}

export function photoUrl(path: string): string {
  return path.startsWith('http') ? path : `${API_BASE}${path}`;
}

/** Builds a hidden HTML form and submits it (full-page POST navigation) — used for eSewa's redirect flow. */
export function submitFormRedirect(actionUrl: string, fields: Record<string, string>) {
  const form = document.createElement('form');
  form.method = 'POST';
  form.action = actionUrl;
  for (const [name, value] of Object.entries(fields)) {
    const input = document.createElement('input');
    input.type = 'hidden';
    input.name = name;
    input.value = value;
    form.appendChild(input);
  }
  document.body.appendChild(form);
  form.submit();
}
