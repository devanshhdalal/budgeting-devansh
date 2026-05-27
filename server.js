import express from 'express';
import cors from 'cors';
import path from 'path';
import { PORT, dataDir, distDir, useGitHub } from './server/config.js';
import { USERS } from './server/config/users.js';
import { requireUser } from './server/middleware/auth.js';
import { migrateLegacyData } from './server/storage/migrate.js';
import transactionsRouter from './server/routes/transactions.js';
import configRouter from './server/routes/config.js';
import uploadRouter from './server/routes/upload.js';

const app = express();

migrateLegacyData();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/api', requireUser);

console.log(`Storage Mode: ${useGitHub ? 'GitHub' : 'Local Disk'}`);
console.log(`Users: ${USERS.map((u) => u.name).join(', ')}`);

for (const { id } of USERS) {
  app.use(`/images/${id}`, express.static(path.join(dataDir, 'users', id, 'images')));
}
app.use('/images', express.static(path.join(dataDir, 'images')));

app.use('/api/config', configRouter);
app.use('/api/transactions', transactionsRouter);
app.use('/api/upload', uploadRouter);

app.use(express.static(distDir));

app.use((_req, res) => {
  res.sendFile(path.join(distDir, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Data directory: ${path.join(dataDir, 'users')}`);
});
