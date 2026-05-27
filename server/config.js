import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const PORT = process.env.PORT || 3000;
export const API_KEY = process.env.API_KEY;

export const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
export const GITHUB_OWNER = process.env.GITHUB_OWNER;
export const GITHUB_REPO = process.env.GITHUB_REPO;
export const GITHUB_BRANCH = process.env.GITHUB_BRANCH || 'main';
export const useGitHub = Boolean(GITHUB_TOKEN && GITHUB_OWNER && GITHUB_REPO);

export const dataDir = path.join(__dirname, '..', 'data');
export const distDir = path.join(__dirname, '..', 'dist');
