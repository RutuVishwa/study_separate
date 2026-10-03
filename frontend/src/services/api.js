const UPLOAD_TIMEOUT_MS = 120000;

function getSameOriginApiBase() {
  if (typeof window !== 'undefined' && window.location?.origin) {
    return `${window.location.origin}/api`;
  }
  return 'http://127.0.0.1:8000/api';
}

function resolveEnvApiBaseUrl() {
  const envUrl = import.meta.env.VITE_API_URL;
  if (!envUrl) return null;
  let trimmed = envUrl.replace(/\/$/, '');
  if (!trimmed.endsWith('/api')) trimmed = `${trimmed}/api`;
  if (typeof window !== 'undefined' && window.location?.protocol === 'https:' && trimmed.startsWith('http:')) {
    trimmed = 'https:' + trimmed.slice(5);
  }
  return trimmed;
}

const ENV_API_BASE = resolveEnvApiBaseUrl();
const SAME_ORIGIN_API_BASE = getSameOriginApiBase();

function buildCandidateBases() {
  const out = [];
  if (ENV_API_BASE) {
    out.push(ENV_API_BASE);
  }
  if (SAME_ORIGIN_API_BASE) {
    const normalizedSame = SAME_ORIGIN_API_BASE;
    if (!out.includes(normalizedSame)) out.push(normalizedSame);
  }
  if (out.length === 0) out.push('http://127.0.0.1:8000/api');
  return out;
}

const API_BASE_CANDIDATES = buildCandidateBases();
const API_BASE_URL = API_BASE_CANDIDATES[0];

export function getApiBaseDiagnostics() {
  const location = typeof window !== 'undefined' ? window.location : null;
  return {
    candidates: API_BASE_CANDIDATES,
    primary: API_BASE_URL,
    locationOrigin: location?.origin || null,
    locationProtocol: location?.protocol || null,
    envUrl: import.meta.env.VITE_API_URL || null,
    envBaseResolved: ENV_API_BASE || null,
  };
}

function responseIsApiResponse(res) {
  const ct = (res.headers?.get('content-type') || '').toLowerCase();
  if (ct.startsWith('application/json')) return true;
  if (ct.startsWith('text/plain')) return true;
  if (ct.includes('text/html')) return false;
  if (res.status >= 400) return true;
  if (ct.length === 0) return true;
  return true;
}

async function tryBases({
  path,
  init,
  expectJson = true,
}) {
  let lastErr = null;
  const tried = [];
  for (const base of API_BASE_CANDIDATES) {
    const fullUrl = `${base}${path}`;
    tried.push(fullUrl);
    let res;
    try {
      res = await fetch(fullUrl, init);
    } catch (err) {
      lastErr = err;
      lastErr.failedBase = base;
      lastErr.basesTried = tried;
      continue;
    }
    if (!res.ok) {
      const errData = expectJson ? await res.json().catch(() => ({})) : {};
      lastErr = new Error(errData.detail || `Request failed (HTTP ${res.status})`);
      lastErr.httpStatus = res.status;
      lastErr.failedBase = base;
      lastErr.basesTried = tried;
      continue;
    }
    if (res.ok && !responseIsApiResponse(res)) {
      lastErr = new Error(`Received a non-API response from ${base}. This can happen when the SPA fallback serves HTML instead of proxying an API request. Trying next endpoint...`);
      lastErr.failedBase = base;
      lastErr.basesTried = tried;
      continue;
    }
    return { res, usedBase: base, tried };
  }
  if (lastErr) {
    lastErr.basesTried = tried;
    throw lastErr;
  }
  throw new Error('Unknown error: no API base candidates succeeded.');
}

export async function fetchHealth() {
  const { res } = await tryBases({
    path: '/health',
    init: { method: 'GET' },
    expectJson: false,
  });
  return await res.json().catch(() => ({ status: 'ok' }));
}

export async function fetchDashboardStats() {
  const { res } = await tryBases({
    path: '/materials/stats',
    init: { method: 'GET' },
    expectJson: true,
  });
  return await res.json();
}

export async function fetchMaterials(subject = null) {
  const suffix = subject && subject !== 'ALL'
    ? `?subject=${encodeURIComponent(subject)}`
    : '';
  const { res } = await tryBases({
    path: `/materials${suffix}`,
    init: { method: 'GET' },
    expectJson: true,
  });
  return await res.json();
}

export async function uploadMaterial(file, subjectOverride = null, onProgress = () => {}) {
  const formData = new FormData();
  formData.append('file', file);
  if (subjectOverride) {
    formData.append('subject_override', subjectOverride);
  }

  const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const timeoutId = controller ? setTimeout(() => controller.abort(), UPLOAD_TIMEOUT_MS) : null;

  const tried = [];
  let lastErr = null;
  let res = null;
  for (const base of API_BASE_CANDIDATES) {
    tried.push(base);
    try {
      res = await fetch(`${base}/materials/upload`, {
        method: 'POST',
        body: formData,
        signal: controller ? controller.signal : undefined,
      });
      if (res.ok && responseIsApiResponse(res)) break;
      if (res.ok) {
        lastErr = new Error(`Got non-API response from ${base} (likely SPA HTML). Falling back...`);
        res = null;
        continue;
      }
      if (res.type && res.type === 'opaque') continue;
      if (res.status >= 400) break;
    } catch (err) {
      if (err?.name === 'AbortError') {
        if (timeoutId) clearTimeout(timeoutId);
        throw new Error('Upload timed out. Please try again with a smaller file or better connection.');
      }
      lastErr = err;
      continue;
    }
  }

  if (timeoutId) clearTimeout(timeoutId);

  if (!res) {
    let msg = 'Upload network error.';
    if (lastErr?.message) msg += ` ${lastErr.message}`;
    if (tried.length > 1) {
      msg += ` Tried ${tried.length} endpoint(s): ${tried.join(' ; ')}.`;
    }
    if (ENV_API_BASE) {
      msg += ` Ensure the backend service is running at ${ENV_API_BASE.replace('/api', '')} and CORS (OPTIONS) preflight requests succeed from your browser.`;
    }
    throw new Error(msg);
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.detail || `Upload failed (HTTP ${res.status})`);
  }
  return data;
}

export async function confirmUpload(tempFileId, confirmedSubject) {
  const body = JSON.stringify({
    temp_file_id: tempFileId,
    confirmed_subject: confirmedSubject,
  });
  const { res } = await tryBases({
    path: '/materials/confirm-upload',
    init: {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
    },
    expectJson: true,
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.detail || 'Confirmation failed');
  }
  return data;
}

export async function deleteMaterial(materialId) {
  const { res } = await tryBases({
    path: `/materials/${materialId}`,
    init: { method: 'DELETE' },
    expectJson: true,
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
