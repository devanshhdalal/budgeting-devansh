import { GITHUB_TOKEN, GITHUB_OWNER, GITHUB_REPO, GITHUB_BRANCH } from './config.js';

export const fetchGitHubFile = async (filePath) => {
  const url = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${filePath}?ref=${GITHUB_BRANCH}`;
  try {
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${GITHUB_TOKEN}`,
        Accept: 'application/vnd.github.v3+json',
        'User-Agent': 'Budgeting-App',
      },
    });
    if (!response.ok) {
      console.error(`GitHub Fetch Error: ${response.status} ${response.statusText} for ${filePath}`);
      return null;
    }
    return await response.json();
  } catch (err) {
    console.error(`Network Error fetching from GitHub: ${err.message}`);
    return null;
  }
};

export const putGitHubFile = async (filePath, contentBase64, message, sha = null) => {
  const url = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${filePath}`;
  const body = { message, content: contentBase64, branch: GITHUB_BRANCH };
  if (sha) body.sha = sha;
  const response = await fetch(url, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${GITHUB_TOKEN}`,
      Accept: 'application/vnd.github.v3+json',
      'User-Agent': 'Budgeting-App',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  return response.ok;
};
