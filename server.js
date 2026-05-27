import express from 'express';
import cors from 'cors';
import path from 'path';
import { PORT, dataDir, distDir, useGitHub } from './server/config.js';
import { requireApiKey } from './server/middleware/auth.js';
import transactionsRouter from './server/routes/transactions.js';
import configRouter from './server/routes/config.js';
import uploadRouter from './server/routes/upload.js';
import { getDataFilePath } from './server/storage/transactions.js';

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/api', requireApiKey);

console.log(`Storage Mode: ${useGitHub ? 'GitHub' : 'Local Disk'}`);

app.use('/api/config', configRouter);
app.use('/api/transactions', transactionsRouter);
app.use('/api/upload', uploadRouter);
app.use('/images', express.static(path.join(dataDir, 'images')));

app.use(express.static(distDir));

app.use((_req, res) => {
  res.sendFile(path.join(distDir, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Transaction data: ${getDataFilePath()}`);
});
