// frontend/src/api_client.js

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  'https://auradrive-api-kakd-afhbhkgadmeffdb9.indiasouthcentral-01.azurewebsites.net';

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

export async function requestPasswordReset(email) {
  const resp = await fetch(`${API_BASE_URL}/api/auth/forgot-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });

  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to send password reset code.');
  }

  return resp.json();
}

export async function verifyResetCode(email, code) {
  const resp = await fetch(`${API_BASE_URL}/api/auth/verify-reset-code`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, code }),
  });

  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}));
    throw new Error(err.detail || 'Invalid verification code.');
  }

  return resp.json();
}

export async function resetPassword(email, code, newPassword) {
  const resp = await fetch(`${API_BASE_URL}/api/auth/reset-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, code, new_password: newPassword }),
  });

  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to reset password.');
  }

  return resp.json();
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

export async function fetchTrashGallery() {
  const token = getAuthToken();
  if (!token) return [];

  const resp = await fetch(`${API_BASE_URL}/api/media/trash`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!resp.ok) return [];

  const rawData = await resp.json();
  const items = Array.isArray(rawData) ? rawData : (rawData.items || []);

  return items.map((item) => ({
    ...item,
    thumbnail_url: cleanHostUrl(item.thumbnail_url),
    full_image_url: cleanHostUrl(item.full_image_url),
  }));
}

export async function moveToTrash(mediaId) {
  const token = getAuthToken();
  const resp = await fetch(`${API_BASE_URL}/api/media/${mediaId}/trash`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!resp.ok) throw new Error('Failed to move item to recycle bin.');
  return resp.json();
}

export async function batchMoveToTrash(mediaIds) {
  const token = getAuthToken();
  const resp = await fetch(`${API_BASE_URL}/api/media/trash/batch`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ media_ids: mediaIds }),
  });
  if (!resp.ok) throw new Error('Failed to move selected items to recycle bin.');
  return resp.json();
}

export async function restoreMedia(mediaId) {
  const token = getAuthToken();
  const resp = await fetch(`${API_BASE_URL}/api/media/${mediaId}/restore`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!resp.ok) throw new Error('Failed to restore item.');
  return resp.json();
}

export async function batchRestoreMedia(mediaIds) {
  const token = getAuthToken();
  const resp = await fetch(`${API_BASE_URL}/api/media/restore/batch`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ media_ids: mediaIds }),
  });
  if (!resp.ok) throw new Error('Failed to restore selected items.');
  return resp.json();
}

export async function permanentlyDeleteMedia(mediaId) {
  const token = getAuthToken();
  const resp = await fetch(`${API_BASE_URL}/api/media/${mediaId}/permanent`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!resp.ok) throw new Error('Failed to permanently delete item.');
  return resp.json();
}

export async function emptyTrash() {
  const token = getAuthToken();
  const resp = await fetch(`${API_BASE_URL}/api/media/trash/empty`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!resp.ok) throw new Error('Failed to empty recycle bin.');
  return resp.json();
}

export async function fetchStorageUsage() {
  const token = getAuthToken();
  if (!token) return null;

  const resp = await fetch(`${API_BASE_URL}/api/media/usage`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!resp.ok) return null;
  return resp.json();
}

export async function createShareLink(mediaId) {
  const token = getAuthToken();
  const resp = await fetch(`${API_BASE_URL}/api/media/${mediaId}/share`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!resp.ok) throw new Error('Failed to create share link.');
  return resp.json();
}

export async function fetchPublicShare(shareId) {
  const resp = await fetch(`${API_BASE_URL}/api/public/share/${shareId}`);
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}));
    throw new Error(err.detail || 'This shared photo is not available.');
  }
  const item = await resp.json();
  return {
    ...item,
    full_image_url: cleanHostUrl(item.full_image_url),
    download_url: cleanHostUrl(item.download_url),
    thumbnail_url: cleanHostUrl(item.thumbnail_url),
  };
}

export async function getDownloadUrl(mediaId) {
  const token = getAuthToken();
  const resp = await fetch(`${API_BASE_URL}/api/media/${mediaId}/download`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!resp.ok) throw new Error('Failed to get download URL.');
  const data = await resp.json();
  return {
    download_url: cleanHostUrl(data.download_url),
    filename: data.filename,
  };
}