import fs from 'fs';
import path from 'path';
import { dataDir } from '../config.js';
import { readJsonFile, writeJsonFile } from './fileStore.js';
import { userPaths } from './paths.js';

const caches = new Map();

const seedConfigFromLegacy = (userId, paths) => {
  const legacy = path.join(dataDir, 'config.json');
  if (fs.existsSync(legacy) && !fs.existsSync(paths.configFile)) {
    fs.mkdirSync(paths.userDir, { recursive: true });
    fs.copyFileSync(legacy, paths.configFile);
  }
};

export const getConfig = async (userId) => {
  if (caches.has(userId)) return caches.get(userId);

  const paths = userPaths(userId);
  fs.mkdirSync(paths.userDir, { recursive: true });
  seedConfigFromLegacy(userId, paths);

  let config = await readJsonFile(paths.configFile, paths.githubConfig);

  if (!config && userId === 'paula') {
    const devanshPaths = userPaths('devansh');
    config = await readJsonFile(devanshPaths.configFile, devanshPaths.githubConfig);
    if (config) {
      const result = await writeJsonFile(
        paths.configFile,
        paths.githubConfig,
        config,
        'Seed Paula config from template'
      );
      if (!result.ok) {
        throw new Error(result.error || 'Failed to seed Paula config');
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
