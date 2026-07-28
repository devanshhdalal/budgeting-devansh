import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { canonicalizeCardName, normalizeConfigCardNames } from '../shared/cardNames.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const usersDir = path.join(root, 'data', 'users');

for (const user of fs.readdirSync(usersDir)) {
  const txPath = path.join(usersDir, user, 'transactions.json');
  const cfgPath = path.join(usersDir, user, 'config.json');

  if (fs.existsSync(txPath)) {
    const txs = JSON.parse(fs.readFileSync(txPath, 'utf8'));
    let changed = 0;
    for (const t of txs) {
      if (!t.Card) continue;
      const canon = canonicalizeCardName(t.Card);
      if (canon !== t.Card) {
        t.Card = canon;
        changed += 1;
      }
    }
    if (changed) {
      fs.writeFileSync(txPath, `${JSON.stringify(txs, null, 2)}\n`);
      console.log(`${user}: updated ${changed} transactions`);
    } else {
      console.log(`${user}: transactions already canonical`);
    }
  }

  if (fs.existsSync(cfgPath)) {
    const cfg = JSON.parse(fs.readFileSync(cfgPath, 'utf8'));
    const { config, changed } = normalizeConfigCardNames(cfg);
    if (changed) {
      fs.writeFileSync(cfgPath, `${JSON.stringify(config, null, 2)}\n`);
      console.log(`${user}: config aliases normalized`);
    } else {
      console.log(`${user}: config already canonical`);
    }
  }
}
