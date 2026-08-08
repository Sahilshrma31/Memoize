import axios from 'axios';

const TOKEN_KEY = 'memoize_token';

// Free hosting tiers idle the API out, so the first request after a quiet spell
// can take ~30s while the instance boots. Anything slower than this is assumed
// to be a cold start, and the UI says so rather than looking frozen.
const COLD_START_THRESHOLD_MS = 2500;

/**
 * Every backend route is mounted under /api (see server.js), so the base URL
 * must end with it. Setting VITE_API_URL to the bare host is an easy mistake
 * and produces 404s that look like missing routes, so normalise here instead:
 * accept the host with or without /api, and with or without a trailing slash.
 */
function resolveBaseUrl() {
  const configured = import.meta.env.VITE_API_URL?.trim();
  if (!configured) return '/api'; // local dev — Vite proxies /api to the server

  const withoutTrailingSlash = configured.replace(/\/+$/, '');
  return /\/api$/.test(withoutTrailingSlash)
    ? withoutTrailingSlash
    : `${withoutTrailingSlash}/api`;
}

const api = axios.create({
  baseURL: resolveBaseUrl(),
  headers: { 'Content-Type': 'application/json' },
  timeout: 60000,
});

let inFlight = 0;
let coldStartTimer = null;
let coldStartAnnounced = false;

function requestStarted() {
  inFlight += 1;
  if (coldStartTimer === null) {
    coldStartTimer = setTimeout(() => {
      if (inFlight > 0) {
        coldStartAnnounced = true;
        window.dispatchEvent(new Event('memoize:waking'));
      }
    }, COLD_START_THRESHOLD_MS);
  }
}

function requestFinished() {
  inFlight = Math.max(0, inFlight - 1);
  if (inFlight === 0) {
    clearTimeout(coldStartTimer);
    coldStartTimer = null;
    if (coldStartAnnounced) {
      coldStartAnnounced = false;
      window.dispatchEvent(new Event('memoize:awake'));
    }
  }
}

api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) config.headers.Authorization = `Bearer ${token}`;
  requestStarted();
  return config;
});

api.interceptors.response.use(
  (response) => {
    requestFinished();
    return response;
  },
  (error) => {
    requestFinished();
    if (error.response?.status === 401) {
      window.dispatchEvent(new Event('memoize:unauthorized'));
    }
    return Promise.reject(error);
  }
);

export const authApi = {
  google: (credential) => api.post('/auth/google', { credential }).then((r) => r.data),
  me: () => api.get('/auth/me').then((r) => r.data),
};

export const problemsApi = {
  list: (params) => api.get('/problems', { params }).then((r) => r.data),
  get: (id) => api.get(`/problems/${id}`).then((r) => r.data),
  create: (payload) => api.post('/problems', payload).then((r) => r.data),
};

export const reviewsApi = {
  today: () => api.get('/reviews/today').then((r) => r.data),
  upcoming: () => api.get('/reviews/upcoming').then((r) => r.data),
  submit: (cardId, payload) => api.post(`/reviews/${cardId}`, payload).then((r) => r.data),
};

// Day boundaries are computed in the viewer's timezone, not UTC — otherwise a
// late-night review lands on the wrong day and appears to break a streak.
const tzOffset = () => new Date().getTimezoneOffset();

export const statsApi = {
  get: () => api.get('/stats', { params: { tzOffset: tzOffset() } }).then((r) => r.data),
  patterns: () => api.get('/stats/patterns').then((r) => r.data),
  activity: (days = 365) =>
    api.get('/stats/activity', { params: { tzOffset: tzOffset(), days } }).then((r) => r.data),
};

export { TOKEN_KEY };
export default api;
