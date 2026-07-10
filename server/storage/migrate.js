import fs from 'fs';
import path from 'path';
import { dataDir } from '../config.js';
import { DEFAULT_USER_ID } from '../config/users.js';
import { userPaths } from './paths.js';

const safeCopy = (label, fn) => {
  try {
    fn();
    console.log(label);
  } catch (e) {
    console.error(`Migration failed: ${label}`, e);
  }
};

/** Move legacy single-user files into data/users/devansh/ */
export const migrateLegacyData = () => {
  const devansh = userPaths(DEFAULT_USER_ID);

  safeCopy('Ensured user directory exists', () => {
    fs.mkdirSync(devansh.userDir, { recursive: true });
  });

  const legacyTx = path.join(dataDir, 'transactions.json');
  safeCopy('Migrated legacy transactions.json → users/devansh/', () => {
    if (fs.existsSync(legacyTx) && !fs.existsSync(devansh.transactionsFile)) {
      fs.copyFileSync(legacyTx, devansh.transactionsFile);
    }
  });

  const legacyConfig = path.join(dataDir, 'config.json');
  safeCopy('Migrated legacy config.json → users/devansh/', () => {
    if (fs.existsSync(legacyConfig) && !fs.existsSync(devansh.configFile)) {
      fs.copyFileSync(legacyConfig, devansh.configFile);
    }
  });

  const legacyImages = path.join(dataDir, 'images');
  safeCopy('Migrated legacy images → users/devansh/images/', () => {
    if (fs.existsSync(legacyImages) && !fs.existsSync(devansh.imagesDir)) {
      fs.cpSync(legacyImages, devansh.imagesDir, { recursive: true });
    }
  });
};
