const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

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

export async function loginUser(email, password) {
  const resp = await fetch(`${API_BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, password }),
  });

  if (!resp.ok) {
    const err = await resp.json();
    throw new Error(err.detail || 'Login failed');
  }

  return resp.json();
}

export async function registerUser(email, password, fullName) {
  const resp = await fetch(`${API_BASE_URL}/api/auth/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email,
      password,
      full_name: fullName,
    }),
  });

  if (!resp.ok) {
    const err = await resp.json();
    throw new Error(err.detail || 'Registration failed');
  }

  return resp.json();
}

export async function uploadMedia(file, title) {
  const token = getAuthToken();
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
    const err = await resp.json();
    throw new Error(err.detail || 'Upload failed');
  }

  return resp.json();
}

export async function fetchUserGallery() {
  const token = getAuthToken();

  if (!token) return [];

  const resp = await fetch(`${API_BASE_URL}/api/media/list`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!resp.ok) return [];

  const items = await resp.json();

  // Rewrite LocalStack container URLs to host if applicable
  return items.map((item) => {
    if (
      item.thumbnail_url &&
      item.thumbnail_url.includes('localstack:4566')
    ) {
      item.thumbnail_url = item.thumbnail_url.replace(
        'localstack:4566',
        'localhost:4566'
      );
    }

    return item;
  });
}