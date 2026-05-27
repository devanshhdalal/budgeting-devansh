import { spawn } from 'node:child_process';

const isWindows = process.platform === 'win32';

const server = spawn(isWindows ? 'node server.js' : 'node', isWindows ? [] : ['server.js'], {
  stdio: 'inherit',
  shell: isWindows,
  env: process.env,
});

const vite = spawn(isWindows ? 'npx vite' : 'npx', isWindows ? [] : ['vite'], {
  stdio: 'inherit',
  shell: isWindows,
  env: process.env,
});

const shutdown = (code = 0) => {
  server.kill();
  vite.kill();
  process.exit(code);
};

process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));

server.on('exit', (code) => {
  if (code !== 0 && code !== null) shutdown(code);
});

vite.on('exit', (code) => {
  if (code !== 0 && code !== null) shutdown(code);
});

console.log('BudgetPro dev: API on http://localhost:3000, UI on http://localhost:5173');
console.log('Transactions persist to data/transactions.json');
