const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/+$/, '');

export function apiUrl(path) {
  if (!path) return API_BASE_URL;
  if (/^https?:\/\//i.test(path)) return path;
  return `${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;
}

export function getToken() {
  return localStorage.getItem('gs_token') || '';
}

export function getStoredUser() {
  try {
    return JSON.parse(localStorage.getItem('gs_user') || 'null');
  } catch {
    return null;
  }
}

export function saveSession(token, user) {
  localStorage.setItem('gs_token', token);
  localStorage.setItem('gs_user', JSON.stringify(user));
}

export function clearSession() {
  localStorage.removeItem('gs_token');
  localStorage.removeItem('gs_user');
}

export async function api(path, options = {}) {
  const headers = { 'X-Client': 'admin', ...(options.headers || {}) };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  let body = options.body;
  if (body && !(body instanceof FormData) && typeof body !== 'string') {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(body);
  }
  const response = await fetch(apiUrl(path), { ...options, headers, body });
  const data = await response.json().catch(() => ({}));
  if (response.status === 401) {
    clearSession();
    if (!window.location.pathname.startsWith('/login')) window.location.assign('/login');
  }
  if (!response.ok) {
    const fallback = response.status === 413
      ? 'File is too large for the server (HTTP 413).'
      : response.status >= 502 && response.status <= 504
        ? `Server timed out or is unavailable (HTTP ${response.status}).`
        : `Request failed (HTTP ${response.status}).`;
    const error = new Error(data.error || fallback);
    error.payload = data;
    error.status = response.status;
    throw error;
  }
  return data;
}

export function formatWhen(value) {
  if (!value) return '—';
  return new Date(value).toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export async function openStoredPdf(path) {
  const response = await fetch(apiUrl(path), {
    headers: { Authorization: `Bearer ${getToken()}` },
  });
  if (!response.ok) throw new Error('Could not open the stored PDF.');
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  window.open(url, '_blank', 'noopener');
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

export async function downloadStoredPdf(path, fileName) {
  const response = await fetch(`${apiUrl(path)}?download=1`, {
    headers: { Authorization: `Bearer ${getToken()}` },
  });
  if (!response.ok) throw new Error('Could not download the stored PDF.');
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName || 'rr-master.pdf';
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

export function openPdf(id) {
  return openStoredPdf(`/api/receipts/${id}/file`);
}
