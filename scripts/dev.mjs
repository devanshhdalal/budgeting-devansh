import { spawn } from 'node:child_process';

const isWindows = process.platform === 'win32';
const npx = isWindows ? 'npx.cmd' : 'npx';

const start = (command, args) =>
  spawn(command, args, { stdio: 'inherit', env: process.env });

const server = start(process.execPath, ['server.js']);
const vite = start(npx, ['vite']);

const children = [server, vite];

const shutdown = (code = 0) => {
  for (const child of children) child.kill();
  process.exit(code);
};

process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));

for (const child of children) {
  child.on('exit', (code) => {
    if (code !== 0 && code !== null) shutdown(code);
  });
}

console.log('BudgetPro dev: API on http://localhost:3000, UI on http://localhost:5173');
console.log('Transactions persist to data/users/<userId>/transactions.json');
