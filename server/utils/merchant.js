/**
 * Each rule: [matcher, canonical name, category].
 * Matching the pattern returns a clean merchant name AND its default category in one step,
 * so adding a new merchant requires a single entry rather than two parallel tables.
 */
const RULES = [
  [/costco\s+gas/i, 'Costco Gas', 'Car'],
  [/costco\s+wholesale|www\s+costco/i, 'Costco Wholesale', 'Groceries'],
  [/wal-?mart\s*\d*/i, 'Walmart', 'Groceries'],
  [/sobeys(\s+#\d+)?/i, 'Sobeys', 'Groceries'],
  [/mcdonald'?s?(\s+#?\d+|\s+canada)?/i, "McDonald's", 'Food'],
  [/quidi\s+vidi/i, 'Quidi Vidi Brewing', 'Food'],
  [/haveli\s+restaurant/i, 'Haveli Restaurant', 'Food'],
  [/osmow'?s?/i, "Osmow's", 'Food'],
  [/despacito\s+bakery/i, 'Despacito Bakery', 'Food'],
  [/wok\s+box/i, 'Wok Box', 'Food'],
  [/dairy\s+queen/i, 'Dairy Queen', 'Food'],
  [/five\s+guys/i, 'Five Guys', 'Food'],
  [/taco\s+bell/i, 'Taco Bell', 'Food'],
  [/domino'?s?(\s+pizza)?/i, "Domino's Pizza", 'Food'],
  [/uber\s+eats/i, 'Uber Eats', 'Food'],
  [/skip\s+the\s+dishes/i, 'Skip The Dishes', 'Food'],
  [/doordash/i, 'DoorDash', 'Food'],
  [/starbucks/i, 'Starbucks', 'Food'],
  [/sushi\s+island/i, 'Sushi Island', 'Food'],
  [/olive\s+branch/i, 'The Olive Branch', 'Food'],
  [/rec\s*room/i, 'Rec Room', 'Food'],
  [/per\s+use\s+parking|parking/i, 'Parking', 'Car'],
  [/circle\s+k/i, 'Circle K', 'Car'],
  [/air-serv/i, 'Air-Serv', 'Travel'],
  [/easyjet/i, 'EasyJet', 'Travel'],
  [/travix/i, 'Travix', 'Travel'],
  [/metrobus/i, 'Metrobus', 'Travel'],
  [/shoppers\s+drug|shoppers/i, 'Shoppers Drug Mart', 'Health'],
  [/lawtons/i, 'Lawtons', 'Health'],
  [/sephora/i, 'Sephora', 'Personal Items'],
  [/atlantic\s+cannabis/i, 'Atlantic Cannabis', 'Personal Items'],
  [/herbal\s+centre/i, 'The Herbal Centre', 'Personal Items'],
  [/marshalls/i, 'Marshalls', 'Personal Items'],
  [/uniqlo/i, 'Uniqlo', 'Personal Items'],
  [/temu/i, 'Temu', 'Personal Items'],
  [/afterpay/i, 'Afterpay', 'Other'],
  [/klarna/i, 'Klarna', 'Personal Items'],
  [/apple\s+bill/i, 'Apple Bill', 'Utilities'],
  [/scotia\s+credit\s+card/i, 'Scotia CC Protection', 'Utilities'],
  [/sauceplus/i, 'SaucePlus', 'Subscriptions'],
  [/tidal/i, 'Tidal', 'Subscriptions'],
  [/disney\+/i, 'Disney+', 'Subscriptions'],
  [/crave/i, 'Crave', 'Subscriptions'],
  [/youtube\s+premium/i, 'YouTube Premium', 'Subscriptions'],
  [/amazon\s+prime/i, 'Amazon Prime', 'Subscriptions'],
  [/amzn\s+mktp|amazon\s+mktp|amazon/i, 'Amazon', 'Other'],
  [/cineplex/i, 'Cineplex', 'Other'],
  [/best\s+buy/i, 'Best Buy', 'Other'],
  [/steam/i, 'Steam', 'Other'],
  [/immigration\s+canada/i, 'Immigration Canada', 'Other'],
  [/mycreds|mycredsmescertif/i, 'MyCreds', 'Other'],
];

const STRIP_PREFIXES = [/^sq\s+\*/i, /^ls\s+/i, /^klarna\*\s*/i];

const LOCATION_TAIL = /\s+(st\.?\s*john'?s?|can|ni|bc|ab|on|mb|toronto|vancouver|calgary|ottawa|winnipeg|mount\s+pearl)\b.*/i;
const STORE_NUMBER_TAIL = /\s+#?\d+.*$/;

const NAME_TO_CATEGORY = new Map(RULES.map(([, name, category]) => [name, category]));

const titleCase = (str) =>
  str.replace(/\w\S*/g, (w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());

export const cleanMerchant = (raw) => {
  if (!raw) return 'Unknown';
  let s = String(raw).trim();

  for (const prefix of STRIP_PREFIXES) {
    s = s.replace(prefix, '').trim();
  }

  for (const [pattern, name] of RULES) {
    if (pattern.test(s)) return name;
  }

  return titleCase(s.replace(LOCATION_TAIL, '').replace(STORE_NUMBER_TAIL, '').trim());
};

export const inferCategory = (cleanName) => {
  if (!cleanName) return 'Other';
  return NAME_TO_CATEGORY.get(cleanName) ?? 'Other';
};
