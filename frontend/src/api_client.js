// frontend/src/api_client.js

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

export function getAuthToken() {
  return localStorage.getItem('auradrive_token');
}

export function setAuthToken(token) {
  if (token) {
    localStorage.setItem('auradrive_token', token);
  } else {
    localStorage.removeItem('auradrive_token');
  }
}

export function getStoredUser() {
  const user = localStorage.getItem('auradrive_user');
  try {
    return user ? JSON.parse(user) : null;
  } catch {
    return null;
  }
}

export function setStoredUser(user) {
  if (user) {
    localStorage.setItem('auradrive_user', JSON.stringify(user));
  } else {
    localStorage.removeItem('auradrive_user');
  }
}

export async function loginUser(email, password) {
  const resp = await fetch(`${API_BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}));
    throw new Error(err.detail || 'Login failed. Please check your credentials.');
  }

  const data = await resp.json();
  if (data.access_token) {
    setAuthToken(data.access_token);
    setStoredUser(data.user);
  }
  return data;
}

export async function registerUser(email, password, fullName) {
  const resp = await fetch(`${API_BASE_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, full_name: fullName }),
  });

  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}));
    throw new Error(err.detail || 'Registration failed.');
  }

  const data = await resp.json();
  if (data.access_token) {
    setAuthToken(data.access_token);
    setStoredUser(data.user);
  }
  return data;
}

export async function uploadMedia(file, title) {
  const token = getAuthToken();
  if (!token) {
    throw new Error('Unauthorized. Please log in first.');
  }

  const formData = new FormData();
  formData.append('file', file);
  formData.append('title', title);

  const resp = await fetch(`${API_BASE_URL}/api/media/upload`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });

  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}));
    throw new Error(err.detail || 'Upload failed.');
  }

  return resp.json();
}

function cleanHostUrl(url) {
  if (!url) return null;
  // Rewrites Docker internal container hostname so browser on host can load it
  return url.replace('localstack:4566', 'localhost:4566');
}

export async function fetchUserGallery() {
  const token = getAuthToken();
  if (!token) return [];

  const resp = await fetch(`${API_BASE_URL}/api/media/list`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (resp.status === 401) {
    setAuthToken(null);
    setStoredUser(null);
    window.location.reload();
    return [];
  }

  if (!resp.ok) return [];

  const rawData = await resp.json();
  const items = Array.isArray(rawData) ? rawData : (rawData.items || []);

  return items.map((item) => ({
    ...item,
    thumbnail_url: cleanHostUrl(item.thumbnail_url),
    full_image_url: cleanHostUrl(item.full_image_url),
  }));
}