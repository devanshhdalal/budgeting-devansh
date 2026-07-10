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

const readLocalJson = (localPath) => {
  try {
    if (fs.existsSync(localPath)) {
      return JSON.parse(fs.readFileSync(localPath, 'utf8'));
    }
  } catch (e) {
    console.error(`Failed to read ${localPath}`, e);
  }
  return null;
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
    throw new Error('Corrupt JSON on GitHub');
  }
};

/** Refuse writes that would wipe most of an existing transaction history. */
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

  if (existingLen >= 5 && newLen < existingLen - 2) {
    throw new Error(
      `Refusing write to ${githubPath}: would shrink ${existingLen} records to ${newLen}`
    );
  }
};

/**
 * Read JSON from GitHub (authoritative when enabled) or local disk.
 * @throws on transient GitHub errors when useGitHub is true
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
    return readLocalJson(localPath);
  }

  throw new Error(`GitHub read failed for ${githubPath}: ${result.error}`);
};

/**
 * Write JSON to durable storage. GitHub must succeed before local when enabled.
 * @returns {{ ok: true } | { ok: false, error: string }}
 */
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
        return { ok: false, error: e.message };
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
    console.error(`Failed to save ${localPath}`, e);
    return { ok: false, error: `Local write failed: ${e.message}` };
  }
};
