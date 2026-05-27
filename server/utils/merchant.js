const CLEAN_RULES = [
  [/costco\s+gas/i, 'Costco Gas'],
  [/costco\s+wholesale|www\s+costco/i, 'Costco Wholesale'],
  [/wal-?mart\s*\d*/i, 'Walmart'],
  [/sobeys(\s+#\d+)?/i, 'Sobeys'],
  [/mcdonald'?s?(\s+#?\d+|\s+canada)?/i, "McDonald's"],
  [/quidi\s+vidi/i, 'Quidi Vidi Brewing'],
  [/haveli\s+restaurant/i, 'Haveli Restaurant'],
  [/osmow'?s?/i, "Osmow's"],
  [/despacito\s+bakery/i, 'Despacito Bakery'],
  [/wok\s+box/i, 'Wok Box'],
  [/dairy\s+queen/i, 'Dairy Queen'],
  [/five\s+guys/i, 'Five Guys'],
  [/taco\s+bell/i, 'Taco Bell'],
  [/domino'?s?(\s+pizza)?/i, "Domino's Pizza"],
  [/uber\s+eats/i, 'Uber Eats'],
  [/skip\s+the\s+dishes/i, 'Skip The Dishes'],
  [/doordash/i, 'DoorDash'],
  [/starbucks/i, 'Starbucks'],
  [/sushi\s+island/i, 'Sushi Island'],
  [/olive\s+branch/i, 'The Olive Branch'],
  [/rec\s*room/i, 'Rec Room'],
  [/per\s+use\s+parking|parking/i, 'Parking'],
  [/circle\s+k/i, 'Circle K'],
  [/air-serv/i, 'Air-Serv'],
  [/easyjet/i, 'EasyJet'],
  [/travix/i, 'Travix'],
  [/metrobus/i, 'Metrobus'],
  [/shoppers\s+drug|shoppers/i, 'Shoppers Drug Mart'],
  [/lawtons/i, 'Lawtons'],
  [/sephora/i, 'Sephora'],
  [/atlantic\s+cannabis/i, 'Atlantic Cannabis'],
  [/herbal\s+centre/i, 'The Herbal Centre'],
  [/marshalls/i, 'Marshalls'],
  [/uniqlo/i, 'Uniqlo'],
  [/temu/i, 'Temu'],
  [/afterpay/i, 'Afterpay'],
  [/klarna/i, 'Klarna'],
  [/apple\s+bill/i, 'Apple Bill'],
  [/scotia\s+credit\s+card/i, 'Scotia CC Protection'],
  [/sauceplus/i, 'SaucePlus'],
  [/tidal/i, 'Tidal'],
  [/disney\+/i, 'Disney+'],
  [/crave/i, 'Crave'],
  [/youtube\s+premium/i, 'YouTube Premium'],
  [/amazon\s+prime/i, 'Amazon Prime'],
  [/amzn\s+mktp|amazon\s+mktp|amazon/i, 'Amazon'],
  [/cineplex/i, 'Cineplex'],
  [/best\s+buy/i, 'Best Buy'],
  [/steam/i, 'Steam'],
  [/immigration\s+canada/i, 'Immigration Canada'],
  [/mycreds|mycredsmescertif/i, 'MyCreds'],
];

const STRIP_PREFIXES = [
  /^sq\s+\*/i,
  /^ls\s+/i,
  /^klarna\*\s*/i,
];

const CATEGORY_MAP = {
  'Costco Gas': 'Car',
  'Costco Wholesale': 'Groceries',
  Walmart: 'Groceries',
  Sobeys: 'Groceries',
  "McDonald's": 'Food',
  'Quidi Vidi Brewing': 'Food',
  'Haveli Restaurant': 'Food',
  "Osmow's": 'Food',
  'Despacito Bakery': 'Food',
  'Wok Box': 'Food',
  'Dairy Queen': 'Food',
  'Five Guys': 'Food',
  'Taco Bell': 'Food',
  "Domino's Pizza": 'Food',
  'Uber Eats': 'Food',
  'Skip The Dishes': 'Food',
  DoorDash: 'Food',
  Starbucks: 'Food',
  'Sushi Island': 'Food',
  'The Olive Branch': 'Food',
  Parking: 'Car',
  'Circle K': 'Car',
  'Air-Serv': 'Travel',
  EasyJet: 'Travel',
  Travix: 'Travel',
  Metrobus: 'Travel',
  'Shoppers Drug Mart': 'Health',
  Lawtons: 'Health',
  Sephora: 'Personal Items',
  'Atlantic Cannabis': 'Personal Items',
  'The Herbal Centre': 'Personal Items',
  Marshalls: 'Personal Items',
  Uniqlo: 'Personal Items',
  Temu: 'Personal Items',
  Afterpay: 'Other',
  Klarna: 'Personal Items',
  'Apple Bill': 'Utilities',
  'Scotia CC Protection': 'Utilities',
  SaucePlus: 'Subscriptions',
  Tidal: 'Subscriptions',
  'Disney+': 'Subscriptions',
  Crave: 'Subscriptions',
  'YouTube Premium': 'Subscriptions',
  'Amazon Prime': 'Subscriptions',
  Amazon: 'Other',
  'Rec Room': 'Food',
  'Cineplex Rec Room': 'Food',
  Cineplex: 'Other',
  'Best Buy': 'Other',
  Steam: 'Other',
  'Immigration Canada': 'Other',
  MyCreds: 'Other',
};

export const cleanMerchant = (raw) => {
  if (!raw) return 'Unknown';
  let s = raw.trim();

  for (const prefix of STRIP_PREFIXES) {
    s = s.replace(prefix, '').trim();
  }

  for (const [pattern, name] of CLEAN_RULES) {
    if (pattern.test(s)) return name;
  }

  s = s
    .replace(/\s+(st\.?\s*john'?s?|can|ni|bc|ab|on|mb|toronto|vancouver|calgary|ottawa|winnipeg|mount\s+pearl)\b.*/i, '')
    .replace(/\s+#?\d+.*$/, '')
    .trim();
  return s.replace(/\w\S*/g, (w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());
};

export const inferCategory = (cleanName) => {
  if (!cleanName) return 'Other';
  return CATEGORY_MAP[cleanName] ?? 'Other';
};