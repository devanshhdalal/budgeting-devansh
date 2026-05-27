import fs from 'fs';
import path from 'path';
import { fetchGitHubFile, putGitHubFile } from '../github.js';
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

export const readJsonFile = async (localPath, githubPath) => {
  if (useGitHub) {
    try {
      const fileData = await fetchGitHubFile(githubPath);
      if (fileData?.content) {
        return JSON.parse(Buffer.from(fileData.content, 'base64').toString('utf8'));
      }
    } catch (e) {
      console.error(`Failed to read ${githubPath} from GitHub`, e);
    }
    console.warn(`GitHub unavailable for ${githubPath}; using local file.`);
  }
  return readLocalJson(localPath);
};

export const writeJsonFile = async (localPath, githubPath, data, message) => {
  const content = JSON.stringify(data, null, 2);

  if (useGitHub) {
    try {
      const fileData = await fetchGitHubFile(githubPath);
      const sha = fileData?.sha ?? null;
      const contentBase64 = Buffer.from(content).toString('base64');
      await putGitHubFile(githubPath, contentBase64, message, sha);
    } catch (e) {
      console.error(`Failed to save ${githubPath} to GitHub`, e);
    }
  }

  try {
    fs.mkdirSync(path.dirname(localPath), { recursive: true });
    fs.writeFileSync(localPath, content);
    return true;
  } catch (e) {
    console.error(`Failed to save ${localPath}`, e);
    return false;
  }
};
