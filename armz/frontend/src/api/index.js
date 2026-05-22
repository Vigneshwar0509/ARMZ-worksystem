const DEFAULT_API_BASE_URL = 'https://armz-worksystem-1.onrender.com';
const BASE_URL = import.meta.env.VITE_API_BASE_URL || (
  typeof window !== 'undefined' && !['localhost', '127.0.0.1'].includes(window.location.hostname)
    ? DEFAULT_API_BASE_URL
    : undefined
);
const BASE = BASE_URL ? `${BASE_URL.replace(/\/$/, '')}/api` : '/api';

function getToken() {
  return localStorage.getItem('armz_token');
}

async function req(method, path, body) {
  const token = getToken();
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (res.status === 401) {
    localStorage.removeItem('armz_token');
    localStorage.removeItem('armz_user');
    window.location.href = '/login';
    throw new Error('Unauthorized');
  }

  if (res.status === 204) return null;

  const text = await res.text();
  const data = text ? JSON.parse(text) : null;

  if (!res.ok) throw new Error(data?.message || `Error ${res.status}`);
  return data;
}

// ── Auth ──────────────────────────────────────────────────────────────────────
export const auth = {
  login: (identifier, password) => req('POST', '/auth/login', { identifier, password }),
};

// ── Employees ─────────────────────────────────────────────────────────────────
export const employees = {
  getAll:         ()           => req('GET',    '/employees'),
  getById:        (id)         => req('GET',    `/employees/${id}`),
  create:         (data)       => req('POST',   '/employees', data),
  update:         (id, data)   => req('PUT',    `/employees/${id}`, data),
  delete:         (id)         => req('DELETE', `/employees/${id}`),
  resetPassword:  (id, pwd)    => req('POST',   `/employees/${id}/reset-password`, { newPassword: pwd }),
};

// ── Attendance ────────────────────────────────────────────────────────────────
export const attendance = {
  today:      (empId)                    => req('GET',  `/attendance/today/${empId}`),
  getRecords: (empId, from, to)          => req('GET',  `/attendance/${empId}?from=${from}&to=${to}`),
  team:       (date)                     => req('GET',  `/attendance/team${date ? `?date=${date}` : ''}`),
  allRecords: (from, to)                 => req('GET',  `/attendance/records/all?from=${from}&to=${to}`),
  summary:    (empId, year, month)       => req('GET',  `/attendance/summary/${empId}?year=${year}&month=${month}`),
  allSummary: (year, month)             => req('GET',  `/attendance/summary/all?year=${year}&month=${month}`),
  checkIn:    (employeeId, mode)         => req('POST', '/attendance/checkin',  { employeeId, mode }),
  checkOut:   (employeeId)               => req('POST', '/attendance/checkout', { employeeId }),
};

// ── Time Entries ──────────────────────────────────────────────────────────────
export const timeEntries = {
  get:    (empId, from, to) => req('GET',    `/timeentries/${empId}?from=${from}&to=${to}`),
  getAll: (from, to)        => req('GET',    `/timeentries/all?from=${from}&to=${to}`),
  create: (data)            => req('POST',   '/timeentries', data),
  update: (id, data)        => req('PUT',    `/timeentries/${id}`, data),
  delete: (id)              => req('DELETE', `/timeentries/${id}`),
};

// ── Projects ──────────────────────────────────────────────────────────────────
export const projects = {
  getAll: ()       => req('GET',  '/projects'),
  create: (data)   => req('POST', '/projects', data),
  toggle: (id)     => req('PUT',  `/projects/${id}/toggle`),
};

export const events = {
  getAll: ()             => req('GET',  '/events'),
  create: (data)         => req('POST', '/events', data),
  update: (id, data)     => req('PUT',  `/events/${id}`, data),
  delete: (id)           => req('DELETE', `/events/${id}`),
};

// ── Leave ─────────────────────────────────────────────────────────────────────
export const leave = {
  my:      (empId)       => req('GET',  `/leave/my/${empId}`),
  pending: ()            => req('GET',  '/leave/pending'),
  all:     (year)        => req('GET',  `/leave/all?year=${year}`),
  balance: (empId, year) => req('GET',  `/leave/balance/${empId}?year=${year}`),
  apply:   (data)        => req('POST', '/leave/apply', data),
  action:  (id, data)    => req('PUT',  `/leave/${id}/action`, data),
  cancel:  (id, empId)   => req('PUT',  `/leave/${id}/cancel?employeeId=${empId}`),
};
