const BASE_URL = 'http://localhost:5002/api';

export function getToken() {
  return localStorage.getItem('ft_token');
}

export function setToken(token) {
  localStorage.setItem('ft_token', token);
}

export function clearToken() {
  localStorage.removeItem('ft_token');
}

export function getUser() {
  try {
    return JSON.parse(localStorage.getItem('ft_user'));
  } catch {
    return null;
  }
}

export function setUser(user) {
  localStorage.setItem('ft_user', JSON.stringify(user));
}

export function clearUser() {
  localStorage.removeItem('ft_user');
}

async function request(method, path, body) {
  const headers = { 'Content-Type': 'application/json' };
  const token = getToken();
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const options = {
    method,
    headers,
  };

  if (body !== undefined) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(BASE_URL + path, options);

  let data;
  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok) {
    const errorMsg = (data && (data.message || data.error)) || `HTTP ${response.status} ${response.statusText}`;
    throw new Error(errorMsg);
  }

  return data;
}

export const api = {
  get:    (path)       => request('GET',    path),
  post:   (path, body) => request('POST',   path, body),
  put:    (path, body) => request('PUT',    path, body),
  delete: (path)       => request('DELETE', path),
};

export function formatINR(value) {
  return '₹' + Number(value || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}
