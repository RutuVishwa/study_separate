const API_BASE_URL = 'http://127.0.0.1:8000/api';

export async function fetchHealth() {
  const res = await fetch('http://127.0.0.1:8000/health');
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

  const res = await fetch(`${API_BASE_URL}/materials/upload`, {
    method: 'POST',
    body: formData,
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.detail || 'Upload failed');
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
