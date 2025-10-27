export function validateAndNormalizeGithubRepo(value: unknown): { owner: string; repo: string } | null {
  if (!value || typeof value !== 'string') return null;
  const v = value.trim();
  if (v.length === 0 || v.length > 300) return null;

  // owner/repo short form
  if (/^[a-zA-Z0-9_-]+\/[a-zA-Z0-9_.-]+$/.test(v)) {
    const [owner, repo] = v.split('/');
    return { owner, repo };
  }

  try {
    const candidate = v.startsWith('http://') || v.startsWith('https://') ? v : `https://${v}`;
    const parsed = new URL(candidate);
    const hostname = parsed.hostname.toLowerCase();
    if (!(hostname === 'github.com' || hostname.endsWith('.github.com'))) return null;
    if (parsed.username || parsed.password) return null;
    const parts = parsed.pathname.split('/').filter(Boolean);
    if (parts.length < 2) return null;
    const owner = parts[0];
    const repo = parts[1].replace(/\.git$/, '');
    return { owner, repo };
  } catch (e) {
    return null;
  }
}

export function normalizeS3Endpoint(value: unknown): string | null {
  if (!value || typeof value !== 'string') return null;
  const v = value.trim();
  if (v.length === 0 || v.length > 200) return null;

  try {
    const candidate = v.startsWith('http://') || v.startsWith('https://') ? v : `https://${v}`;
    const parsed = new URL(candidate);
    if (parsed.username || parsed.password) return null;
    // Remove trailing slash
    return candidate.replace(/\/+$/, '');
  } catch (e) {
    return null;
  }
}

export function validateFrontendUrl(value: unknown): string | null {
  if (!value || typeof value !== 'string') return null;
  const v = value.trim();
  if (v.length === 0 || v.length > 200) return null;
  try {
    const candidate = v.startsWith('http://') || v.startsWith('https://') ? v : `https://${v}`;
    const parsed = new URL(candidate);
    if (parsed.username || parsed.password) return null;
    return candidate.replace(/\/+$/, '');
  } catch (e) {
    return null;
  }
}

export default {
  validateAndNormalizeGithubRepo,
  normalizeS3Endpoint,
  validateFrontendUrl,
};
