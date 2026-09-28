// Development uses Vite's same-origin /api proxy. Production sets VITE_API_BASE_URL to Render.
const API_BASE = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');
const STORAGE_KEY = 'redcell_session';

let token = localStorage.getItem(STORAGE_KEY) || '';

export const sessionStore = {
  getToken: () => token,
  setToken(nextToken) {
    token = nextToken || '';
    if (token) localStorage.setItem(STORAGE_KEY, token);
    else localStorage.removeItem(STORAGE_KEY);
  }
};

export class ApiError extends Error {
  constructor(message, status, code) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

async function request(path, options = {}) {
  const headers = { ...(options.body ? { 'Content-Type': 'application/json' } : {}), ...(options.headers || {}) };
  if (token) headers.Authorization = `Bearer ${token}`;
  let response;
  try {
    response = await fetch(`${API_BASE}${path}`, { ...options, headers, credentials: 'include' });
  } catch {
    throw new ApiError('Unable to reach red cell.ai. Please check your connection and try again.', 0, 'NETWORK_ERROR');
  }
  if (response.status === 204) return null;
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new ApiError(body?.error?.message || 'Something went wrong. Please try again.', response.status, body?.error?.code);
  return body;
}

export const api = {
  register: (data) => request('/api/auth/register', { method: 'POST', body: JSON.stringify(data) }),
  login: (data) => request('/api/auth/login', { method: 'POST', body: JSON.stringify(data) }),
  logout: () => request('/api/auth/logout', { method: 'POST' }),
  me: () => request('/api/auth/me'),
  getItems: (filters = {}) => {
    const params = new URLSearchParams(Object.entries(filters).filter(([, value]) => value !== '' && value !== undefined && value !== false));
    return request(`/api/items${params.toString() ? `?${params}` : ''}`);
  },
  getStats: () => request('/api/items/stats'),
  createItem: (data) => request('/api/items', { method: 'POST', body: JSON.stringify(data) }),
  updateItem: (id, data) => request(`/api/items/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteItem: (id) => request(`/api/items/${id}`, { method: 'DELETE' }),
  acceptItem: (id) => request(`/api/items/${id}/accept`, { method: 'POST' }),
  getDelivery: (id) => request(`/api/items/${id}/delivery`),
  addDeliveryEvent: (id, data) => request(`/api/items/${id}/delivery/events`, { method: 'POST', body: JSON.stringify(data) }),
  deliverItem: (id) => request(`/api/items/${id}/deliver`, { method: 'POST' }),
  generateAI: (data) => request('/api/ai/generate', { method: 'POST', body: JSON.stringify(data) })
};
