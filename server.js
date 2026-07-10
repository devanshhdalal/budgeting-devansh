import express from 'express';
import cors from 'cors';
import path from 'path';
import { PORT, dataDir, distDir, useGitHub, GITHUB_OWNER, GITHUB_REPO, GITHUB_BRANCH } from './server/config.js';
import { USERS } from './server/config/users.js';
import { requireUser } from './server/middleware/auth.js';
import { errorHandler } from './server/middleware/errorHandler.js';
import { migrateLegacyData } from './server/storage/migrate.js';
import transactionsRouter from './server/routes/transactions.js';
import configRouter from './server/routes/config.js';
import uploadRouter from './server/routes/upload.js';
import ingestRouter from './server/routes/ingest.js';
import billingRouter from './server/routes/billing.js';

const app = express();

try {
  migrateLegacyData();
} catch (e) {
  console.error('Migration error (non-fatal):', e);
}

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/api', requireUser);

console.log(`Storage Mode: ${useGitHub ? 'GitHub' : 'Local Disk'}`);
if (useGitHub) {
  console.log(`GitHub sync: ${GITHUB_OWNER}/${GITHUB_REPO}@${GITHUB_BRANCH}`);
}
console.log(`Users: ${USERS.map((u) => u.name).join(', ')}`);

for (const { id } of USERS) {
  app.use(`/images/${id}`, express.static(path.join(dataDir, 'users', id, 'images')));
}

app.get('/health', (_req, res) => {
  res.json({
    ok: true,
    storage: useGitHub ? 'github' : 'local',
    ...(useGitHub && { repo: `${GITHUB_OWNER}/${GITHUB_REPO}`, branch: GITHUB_BRANCH }),
  });
});

app.use('/api/config', configRouter);
app.use('/api/transactions', transactionsRouter);
app.use('/api/upload', uploadRouter);
app.use('/api/ingest', ingestRouter);
app.use('/api/billing', billingRouter);

app.use(express.static(distDir));

app.use((_req, res, next) => {
  res.sendFile(path.join(distDir, 'index.html'), (err) => {
    if (err) next(err);
  });
});

app.use(errorHandler);

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled rejection:', reason);
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught exception:', err);
});

const server = app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Data directory: ${path.join(dataDir, 'users')}`);
});

server.on('error', (err) => {
  console.error('Server failed to start:', err);
  process.exit(1);
});
