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

function buildCandidateBases() {
  if (ENV_API_BASE) {
    return [ENV_API_BASE];
  }
  return [getSameOriginApiBase()];
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
    isDevProxy: ENV_API_BASE == null,
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

export async function fetchHealth({ retries = 3, retryDelayMs = 1200 } = {}) {
  let lastErr = null;
  for (let i = 0; i < retries; i++) {
    try {
      const { res } = await tryBases({
        path: '/health',
        init: { method: 'GET' },
        expectJson: false,
      });
      const data = await res.json().catch(() => ({ status: 'ok' }));
      if (data) return data;
    } catch (err) {
      lastErr = err;
      if (i < retries - 1) await new Promise(r => setTimeout(r, retryDelayMs * (i + 1)));
    }
  }
  if (lastErr) throw lastErr;
  return { status: 'ok' };
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
  let wokeBackend = false;
  try {
    await fetchHealth({ retries: 4, retryDelayMs: 1200 });
    wokeBackend = true;
  } catch {
  }

  const formData = new FormData();
  formData.append('file', file);
  if (subjectOverride) {
    formData.append('subject_override', subjectOverride);
  }

  const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const timeoutId = controller ? setTimeout(() => controller.abort(), UPLOAD_TIMEOUT_MS) : null;

  const MAX_ATTEMPTS = 2;
  let lastErr = null;
  let res = null;
  const base = API_BASE_URL;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      res = await fetch(`${base}/materials/upload`, {
        method: 'POST',
        body: formData,
        signal: controller ? controller.signal : undefined,
      });
      if (res.ok && responseIsApiResponse(res)) break;
      if (res.ok) {
        lastErr = new Error(`Got non-API response from ${base} (likely SPA HTML).`);
        res = null;
        break;
      }
      if (res.type && res.type === 'opaque') {
        lastErr = new Error('Got opaque (no-cors) response from the backend. CORS preflight likely blocked by the browser.');
        res = null;
      }
      if (res.status >= 400 && attempt === MAX_ATTEMPTS) break;
      if (res.status >= 400) break;
      lastErr = new Error(`Upload attempt ${attempt} failed (HTTP ${res.status}). Retrying…`);
      res = null;
    } catch (err) {
      if (err?.name === 'AbortError') {
        if (timeoutId) clearTimeout(timeoutId);
        throw new Error('Upload timed out. Please try again with a smaller file or better connection.');
      }
      lastErr = err;
      if (attempt < MAX_ATTEMPTS) {
        await new Promise(r => setTimeout(r, 800 * attempt));
        continue;
      }
    }
  }

  if (timeoutId) clearTimeout(timeoutId);

  if (!res) {
    let msg = `Upload network error. Backend used: ${base}.`;
    if (wokeBackend) msg += ' (Pre-flight health check succeeded, so backend is reachable for GETs.)';
    if (lastErr) {
      if (/failed to fetch|networkerror|typeerror/i.test(lastErr.constructor.name + ' ' + (lastErr.message || ''))) {
        msg += ' Browser blocked the CORS preflight (OPTIONS) request or the backend was unreachable during upload.';
        msg += ' Ensure both sites are served over HTTPS and the backend is awake (Render free-tier spin-down can cause this).';
        if (lastErr?.message) msg += ` Detail: ${lastErr.message}`;
      } else if (lastErr?.message) {
        msg += ` ${lastErr.message}`;
      }
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
