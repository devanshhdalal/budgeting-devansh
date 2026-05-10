import fs from 'fs';
import path from 'path';

const files = ['data/transactions_april_2026.json', 'data/transactions_may_2026.json'];
let allTransactions = [];

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  // Replace NaN with null
  content = content.replace(/NaN/g, 'null');
  try {
    const data = JSON.parse(content);
    allTransactions = allTransactions.concat(data);
  } catch (e) {
    console.error(`Error parsing ${file}`, e);
  }
}

// Sort by date descending
allTransactions.sort((a, b) => new Date(b.Date) - new Date(a.Date));

fs.writeFileSync('public/transactions.json', JSON.stringify(allTransactions, null, 2));
console.log('Cleaned transactions and saved to public/transactions.json');
