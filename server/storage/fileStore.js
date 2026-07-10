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
    return readLocalJson(localPath);
  }

  throw storageError(`GitHub read failed for ${githubPath}: ${result.error}`);
};

export const writeJsonFile = async (localPath, githubPath, data, message) => {
  const content = serializeJson(data);

  if (useGitHub) {
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

    const putResult = await putGitHubFile(
      githubPath,
      encodeGitHubContent(content),
      message,
      sha
    );

    if (!putResult.ok) {
      return { ok: false, error: `GitHub write failed: ${putResult.error}` };
    }
  }

  try {
    writeLocalFile(localPath, content);
    return { ok: true };
  } catch (e) {
    if (useGitHub) {
      console.warn(`GitHub saved but local cache failed for ${localPath}:`, e.message);
      return { ok: true, warning: 'local_cache_failed' };
    }
    console.error(`Failed to save ${localPath}`, e);
    return { ok: false, error: `Local write failed: ${e.message}` };
  }
};
