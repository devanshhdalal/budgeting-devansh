import path from 'path';
import { dataDir } from '../config.js';

export const userPaths = (userId) => {
  const userDir = path.join(dataDir, 'users', userId);
  return {
    userDir,
    transactionsFile: path.join(userDir, 'transactions.json'),
    configFile: path.join(userDir, 'config.json'),
    imagesDir: path.join(userDir, 'images'),
    githubTransactions: `data/users/${userId}/transactions.json`,
    githubConfig: `data/users/${userId}/config.json`,
    githubImagesPrefix: `data/users/${userId}/images`,
  };
};
