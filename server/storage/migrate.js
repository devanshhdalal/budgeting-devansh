import fs from 'fs';
import path from 'path';
import { dataDir } from '../config.js';
import { userPaths } from './paths.js';

/** Move legacy single-user files into data/users/devansh/ */
export const migrateLegacyData = () => {
  const devansh = userPaths('devansh');
  fs.mkdirSync(devansh.userDir, { recursive: true });

  const legacyTx = path.join(dataDir, 'transactions.json');
  if (fs.existsSync(legacyTx) && !fs.existsSync(devansh.transactionsFile)) {
    fs.copyFileSync(legacyTx, devansh.transactionsFile);
    console.log('Migrated legacy transactions.json → users/devansh/');
  }

  const legacyConfig = path.join(dataDir, 'config.json');
  if (fs.existsSync(legacyConfig) && !fs.existsSync(devansh.configFile)) {
    fs.copyFileSync(legacyConfig, devansh.configFile);
    console.log('Migrated legacy config.json → users/devansh/');
  }

  const legacyImages = path.join(dataDir, 'images');
  if (fs.existsSync(legacyImages) && !fs.existsSync(devansh.imagesDir)) {
    fs.cpSync(legacyImages, devansh.imagesDir, { recursive: true });
    console.log('Migrated legacy images → users/devansh/images/');
  }
};
