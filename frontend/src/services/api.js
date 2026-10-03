const UPLOAD_TIMEOUT_MS = 120000;

function resolveApiBaseUrl() {
  const envUrl = import.meta.env.VITE_API_URL;
  let base;
  if (!envUrl) {
    if (typeof window !== 'undefined' && window.location?.origin) {
      base = `${window.location.origin}/api`;
    } else {
      base = 'http://127.0.0.1:8000/api';
    }
  } else {
    const trimmed = envUrl.replace(/\/$/, '');
    base = trimmed.endsWith('/api') ? trimmed : `${trimmed}/api`;
  }
  if (typeof window !== 'undefined' && window.location?.protocol === 'https:' && base.startsWith('http:')) {
    base = 'https:' + base.slice(5);
  }
  return base;
}

const API_BASE_URL = resolveApiBaseUrl();

export async function fetchHealth() {
  const res = await fetch(`${API_BASE_URL.replace('/api', '')}/health`);
  if (!res.ok) throw new Error('Backend health check failed');
  return res.json();
}

export async function fetchDashboardStats() {
  const res = await fetch(`${API_BASE_URL}/materials/stats`);
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || 'Failed to fetch dashboard stats');
  }
  return res.json();
}

export async function fetchMaterials(subject = null) {
  let url = `${API_BASE_URL}/materials`;
  if (subject && subject !== 'ALL') {
    url += `?subject=${encodeURIComponent(subject)}`;
  }
  const res = await fetch(url);
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || 'Failed to fetch materials');
  }
  return res.json();
}

export async function uploadMaterial(file, subjectOverride = null, onProgress = () => {}) {
  const formData = new FormData();
  formData.append('file', file);
  if (subjectOverride) {
    formData.append('subject_override', subjectOverride);
  }

  const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const timeoutId = controller ? setTimeout(() => controller.abort(), UPLOAD_TIMEOUT_MS) : null;

  let res;
  try {
    res = await fetch(`${API_BASE_URL}/materials/upload`, {
      method: 'POST',
      body: formData,
      signal: controller ? controller.signal : undefined,
    });
  } catch (err) {
    if (err?.name === 'AbortError') {
      throw new Error('Upload timed out. Please try again with a smaller file or better connection.');
    }
    if (err instanceof TypeError && /failed to fetch|networkerror/i.test(err.message || '')) {
      throw new Error('Network error. Check your connection or try again (this can also happen if CORS or mixed HTTP/HTTPS is misconfigured).');
    }
    throw new Error(err?.message || 'Upload failed');
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.detail || `Upload failed (HTTP ${res.status})`);
  }
  return data;
}

export async function confirmUpload(tempFileId, confirmedSubject) {
  const res = await fetch(`${API_BASE_URL}/materials/confirm-upload`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      temp_file_id: tempFileId,
      confirmed_subject: confirmedSubject,
    }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.detail || 'Confirmation failed');
  }
  return data;
}

export async function deleteMaterial(materialId) {
  const res = await fetch(`${API_BASE_URL}/materials/${materialId}`, {
    method: 'DELETE',
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.detail || 'Deletion failed');
  }
  return data;
}

export function getDownloadUrl(materialId) {
  return `${API_BASE_URL}/materials/${materialId}/download`;
}
