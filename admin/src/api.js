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
  const response = await fetch(path, { ...options, headers, body });
  const data = await response.json().catch(() => ({}));
  if (response.status === 401) {
    clearSession();
    if (!window.location.pathname.startsWith('/login')) window.location.assign('/login');
  }
  if (!response.ok) {
    const error = new Error(data.error || 'Request failed.');
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
  const response = await fetch(path, {
    headers: { Authorization: `Bearer ${getToken()}` },
  });
  if (!response.ok) throw new Error('Could not open the stored PDF.');
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  window.open(url, '_blank', 'noopener');
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

export async function downloadStoredPdf(path, fileName) {
  const response = await fetch(`${path}?download=1`, {
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
