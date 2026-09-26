/*
OWNER: Frontend Developer
TASK: Communication helper with the FastAPI backend.
*/

const API_BASE_URL =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_BASE_URL) ||
  'http://localhost:8000';

/**
 * Upload an image file with metadata to the backend.
 */
export async function uploadMedia(file, title) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('title', title);

  const response = await fetch(`${API_BASE_URL}/upload`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || `Upload failed with status ${response.status}`);
  }

  return response.json();
}

/**
 * Fetch all processed media items from DynamoDB.
 */
export async function fetchMediaList() {
  const response = await fetch(`${API_BASE_URL}/media/list`);
  if (!response.ok) {
    // Fallback to /list if /media/list is not routed
    const fallbackResponse = await fetch(`${API_BASE_URL}/list`);
    if (!fallbackResponse.ok) {
      throw new Error(`Failed to fetch media list: ${response.statusText}`);
    }
    const fallbackData = await fallbackResponse.json();
    return fallbackData.items || [];
  }
  const data = await response.json();
  return data.items || [];
}

/**
 * Fetch the processing status of a single media item.
 */
export async function fetchMediaStatus(mediaId) {
  const response = await fetch(`${API_BASE_URL}/status?id=${encodeURIComponent(mediaId)}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch status for ${mediaId}`);
  }
  return response.json();
}

/**
 * Generate a pre-signed S3 download/display URL for an item.
 */
export async function fetchMediaUrl(mediaId) {
  const response = await fetch(`${API_BASE_URL}/media?id=${encodeURIComponent(mediaId)}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch pre-signed URL for ${mediaId}`);
  }
  const data = await response.json();
  return data.url;
}

/**
 * Concurrently resolves pre-signed URLs for all gallery items.
 */
export async function fetchGalleryWithUrls() {
  const items = await fetchMediaList();

  const hydratedItems = await Promise.all(
    items.map(async (item) => {
      try {
        const presignedUrl = await fetchMediaUrl(item.media_id);
        return { ...item, url: presignedUrl };
      } catch (err) {
        console.warn(`Could not resolve URL for ${item.media_id}:`, err);
        return { ...item, url: null };
      }
    })
  );

  return hydratedItems;
}