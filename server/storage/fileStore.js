import fs from 'fs';
import path from 'path';
import {
  decodeGitHubContent,
  encodeGitHubContent,
  fetchGitHubFile,
  putGitHubFile,
  serializeJson,
} from '../github.js';
import { useGitHub } from '../config.js';
import { conflict, storageError } from '../errors.js';

const SHRINK_GUARD_MIN = 5;
const SHRINK_GUARD_TOLERANCE = 2;

const readLocalJson = (localPath) => {
  if (!fs.existsSync(localPath)) return null;
  try {
    return JSON.parse(fs.readFileSync(localPath, 'utf8'));
  } catch (e) {
    console.error(`Corrupt local JSON at ${localPath}`, e);
    throw storageError('Local data file is corrupt', { cause: e });
  }
};

const writeLocalFile = (localPath, content) => {
  fs.mkdirSync(path.dirname(localPath), { recursive: true });
  fs.writeFileSync(localPath, content, 'utf8');
};

const writeLocalBuffer = (localPath, buffer) => {
  fs.mkdirSync(path.dirname(localPath), { recursive: true });
  fs.writeFileSync(localPath, buffer);
};

const parseGitHubJson = (fileData) => {
  if (!fileData?.content) return null;
  try {
    return JSON.parse(decodeGitHubContent(fileData.content));
  } catch (e) {
    console.error('Failed to parse GitHub JSON content', e);
    throw storageError('Corrupt JSON on GitHub', { cause: e });
  }
};

const assertNotDestructiveShrink = (existingContent, newData, githubPath) => {
  if (!existingContent) return;

  let existing;
  try {
    existing = JSON.parse(decodeGitHubContent(existingContent));
  } catch {
    return;
  }

  if (!Array.isArray(existing) || !Array.isArray(newData)) return;

  const existingLen = existing.length;
  const newLen = newData.length;

  if (existingLen >= SHRINK_GUARD_MIN && newLen < existingLen - SHRINK_GUARD_TOLERANCE) {
    throw conflict(
      `Refusing write to ${githubPath}: would shrink ${existingLen} records to ${newLen}`
    );
  }
};

const putGitHubWithRetry = async (githubPath, contentBase64, message, sha) => {
  let putResult = await putGitHubFile(githubPath, contentBase64, message, sha);
  if (!putResult.ok && putResult.status === 409) {
    const current = await fetchGitHubFile(githubPath);
    if (current.ok) {
      putResult = await putGitHubFile(
        githubPath,
        contentBase64,
        message,
        current.data.sha
      );
    }
  }
  return putResult;
};

const pushJsonToGitHub = async (githubPath, data, message) => {
  const content = serializeJson(data);
  const current = await fetchGitHubFile(githubPath);

  if (!current.ok && !current.notFound) {
    return { ok: false, error: `GitHub unavailable: ${current.error}` };
  }

  const sha = current.ok ? current.data.sha : null;

  if (current.ok) {
    try {
      assertNotDestructiveShrink(current.data.content, data, githubPath);
    } catch (e) {
      return { ok: false, error: e.message, code: e.code };
    }
  }

  const putResult = await putGitHubWithRetry(
    githubPath,
    encodeGitHubContent(content),
    message,
    sha
  );

  if (!putResult.ok) {
    return { ok: false, error: `GitHub write failed: ${putResult.error}` };
  }

  console.log(`[storage] GitHub saved ${githubPath}`);
  return { ok: true, content };
};

/**
 * Read JSON — GitHub is authoritative when configured.
 * If GitHub is missing a file but local cache exists, recover by pushing local → GitHub.
 */
export const readJsonFile = async (localPath, githubPath) => {
  if (!useGitHub) {
    return readLocalJson(localPath);
  }

  const result = await fetchGitHubFile(githubPath);

  if (result.ok) {
    const data = parseGitHubJson(result.data);
    if (data !== null) {
      writeLocalFile(localPath, serializeJson(data));
    }
    return data;
  }

  if (result.notFound) {
    const local = readLocalJson(localPath);
    if (local !== null) {
      console.warn(`[storage] Recovering missing GitHub file from local cache: ${githubPath}`);
      const recovered = await writeJsonFile(localPath, githubPath, local, `Recover ${githubPath} from local`);
      if (!recovered.ok) {
        throw storageError(`Failed to recover ${githubPath} to GitHub: ${recovered.error}`);
      }
    }
    return local;
  }

  throw storageError(`GitHub read failed for ${githubPath}: ${result.error}`);
};

/** Write JSON — GitHub first, then local cache. */
export const writeJsonFile = async (localPath, githubPath, data, message) => {
  let content = serializeJson(data);

  if (useGitHub) {
    const githubResult = await pushJsonToGitHub(githubPath, data, message);
    if (!githubResult.ok) {
      return githubResult;
    }
    content = githubResult.content;
  }

  try {
    writeLocalFile(localPath, content);
    return { ok: true };
  } catch (e) {
    if (useGitHub) {
      console.warn(`[storage] GitHub saved but local cache failed for ${localPath}:`, e.message);
      return { ok: true, warning: 'local_cache_failed' };
    }
    console.error(`Failed to save ${localPath}`, e);
    return { ok: false, error: `Local write failed: ${e.message}` };
  }
};

/** Write binary assets (receipts, card images) — GitHub first, then local cache. */
export const writeBinaryFile = async (localPath, githubPath, buffer, message) => {
  const contentBase64 = buffer.toString('base64');

  if (useGitHub) {
    const current = await fetchGitHubFile(githubPath);
    if (!current.ok && !current.notFound) {
      return { ok: false, error: `GitHub unavailable: ${current.error}` };
    }

    const sha = current.ok ? current.data.sha : null;
    const putResult = await putGitHubWithRetry(githubPath, contentBase64, message, sha);
    if (!putResult.ok) {
      return { ok: false, error: `GitHub write failed: ${putResult.error}` };
    }
    console.log(`[storage] GitHub saved ${githubPath}`);
  }

  try {
    writeLocalBuffer(localPath, buffer);
    return { ok: true };
  } catch (e) {
    if (useGitHub) {
      console.warn(`[storage] GitHub saved but local cache failed for ${localPath}:`, e.message);
      return { ok: true, warning: 'local_cache_failed' };
    }
    return { ok: false, error: `Local write failed: ${e.message}` };
  }
};
