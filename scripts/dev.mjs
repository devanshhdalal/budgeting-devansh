import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

const server = spawn(process.execPath, ['server.js'], {
  stdio: 'inherit',
  env: process.env,
  cwd: root,
});

const viteBin = path.join(root, 'node_modules', 'vite', 'bin', 'vite.js');
const vite = spawn(process.execPath, [viteBin], {
  stdio: 'inherit',
  env: process.env,
  cwd: root,
});

const children = [server, vite];

const shutdown = (code = 0) => {
  for (const child of children) {
    if (!child.killed) child.kill();
  }
  process.exit(code);
};

process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));

for (const child of children) {
  child.on('exit', (code) => {
    if (code !== 0 && code !== null) shutdown(code);
  });
}

console.log('Savvr dev: API on http://localhost:3000, UI on http://localhost:5173');
