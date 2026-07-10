import fs from 'fs';
import { DEFAULT_USER_ID } from '../config/users.js';
import { storageError } from '../errors.js';
import { readJsonFile, writeJsonFile } from './fileStore.js';
import { userPaths } from './paths.js';

const caches = new Map();

export const getConfig = async (userId) => {
  if (caches.has(userId)) return caches.get(userId);

  const paths = userPaths(userId);
  fs.mkdirSync(paths.userDir, { recursive: true });

  let config = await readJsonFile(paths.configFile, paths.githubConfig);

  if (!config && userId === 'paula') {
    const devanshPaths = userPaths(DEFAULT_USER_ID);
    config = await readJsonFile(devanshPaths.configFile, devanshPaths.githubConfig);
    if (config) {
      const result = await writeJsonFile(
        paths.configFile,
        paths.githubConfig,
        config,
        'Seed Paula config from template'
      );
      if (!result.ok) {
        throw storageError(result.error || 'Failed to seed Paula config');
      }
    }
  }

  caches.set(userId, config);
  return config;
};

export const saveConfig = async (userId, newConfig) => {
  const paths = userPaths(userId);
  const result = await writeJsonFile(
    paths.configFile,
    paths.githubConfig,
    newConfig,
    `Update config (${userId})`
  );

  if (!result.ok) {
    return result;
  }

  caches.set(userId, newConfig);
  return result;
};
