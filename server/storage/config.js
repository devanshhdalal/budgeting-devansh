import path from 'path';
import { dataDir } from '../config.js';
import { readJsonFile, writeJsonFile } from './fileStore.js';

const configFile = path.join(dataDir, 'config.json');
const GITHUB_PATH = 'data/config.json';

let cache = null;

export const getConfig = async () => {
  if (cache) return cache;
  cache = await readJsonFile(configFile, GITHUB_PATH);
  return cache;
};

export const saveConfig = async (newConfig) => {
  cache = newConfig;
  return writeJsonFile(configFile, GITHUB_PATH, newConfig, 'Update config via App');
};
