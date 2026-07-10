import { GITHUB_TOKEN, GITHUB_OWNER, GITHUB_REPO, GITHUB_BRANCH } from './config.js';

const githubHeaders = {
  Authorization: `Bearer ${GITHUB_TOKEN}`,
  Accept: 'application/vnd.github.v3+json',
  'User-Agent': 'Savvr',
};

/** URL-encode each path segment for the Contents API. */
export const encodeGitHubPath = (filePath) =>
  filePath.split('/').map((segment) => encodeURIComponent(segment)).join('/');

/** Canonical JSON for local + GitHub writes (pretty-printed, trailing newline). */
export const serializeJson = (data) => `${JSON.stringify(data, null, 2)}\n`;

/** Decode base64 from GitHub Contents API (strip embedded newlines). */
export const decodeGitHubContent = (base64) =>
  Buffer.from(base64.replace(/\n/g, ''), 'base64').toString('utf8');

/** Encode UTF-8 content for GitHub PUT body. */
export const encodeGitHubContent = (utf8) => Buffer.from(utf8, 'utf8').toString('base64');

const parseGitHubError = async (response) => {
  try {
    const body = await response.json();
    if (body?.message) return body.message;
  } catch {
    // ignore
  }
  return `${response.status} ${response.statusText}`;
};

const contentsUrl = (filePath) =>
  `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${encodeGitHubPath(filePath)}`;

/**
 * @returns {{ ok: true, data: object } | { ok: false, notFound: true } | { ok: false, notFound: false, status: number, error: string }}
 */
export const fetchGitHubFile = async (filePath) => {
  const url = `${contentsUrl(filePath)}?ref=${GITHUB_BRANCH}`;
  try {
    const response = await fetch(url, { headers: githubHeaders });

    if (response.status === 404) {
      return { ok: false, notFound: true };
    }

    if (!response.ok) {
      const error = await parseGitHubError(response);
      console.error(`GitHub fetch failed for ${filePath}: ${error}`);
      return { ok: false, notFound: false, status: response.status, error };
    }

    const data = await response.json();
    return { ok: true, data };
  } catch (err) {
    const error = err?.message ?? 'Network error';
    console.error(`GitHub fetch network error for ${filePath}: ${error}`);
    return { ok: false, notFound: false, status: 0, error };
  }
};

/**
 * @returns {{ ok: true, sha?: string } | { ok: false, status: number, error: string }}
 */
export const putGitHubFile = async (filePath, contentBase64, message, sha = null) => {
  const url = contentsUrl(filePath);
  const body = { message, content: contentBase64, branch: GITHUB_BRANCH };
  if (sha) body.sha = sha;

  try {
    const response = await fetch(url, {
      method: 'PUT',
      headers: { ...githubHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await parseGitHubError(response);
      console.error(`GitHub put failed for ${filePath}: ${error}`);
      return { ok: false, status: response.status, error };
    }

    try {
      const result = await response.json();
      return { ok: true, sha: result?.content?.sha };
    } catch {
      return { ok: true };
    }
  } catch (err) {
    const error = err?.message ?? 'Network error';
    console.error(`GitHub put network error for ${filePath}: ${error}`);
    return { ok: false, status: 0, error };
  }
};
