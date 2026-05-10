/**
 * Centralized Card, Category, and Budget Configuration
 * 
 * This is the single source of truth for all cards, categories,
 * reward multipliers, and monthly budget limits.
 * 
 * To add a new card: add an entry to CARDS.
 * To change reward multipliers: edit the multipliers object on the card.
 * To change budget limits: edit BUDGET_CONFIG.
 * To add a new category: add an entry to CATEGORIES.
 */

export const CARDS = {
  "AMEX Cobalt": {
    currency: "MR Points",
    multipliers: {
      "Food": 5,
      "Groceries": 5,
      "Travel": 2,
      "Car": 2,
      "Base": 1
    }
  },
  "Scene+ Visa": {
    currency: "Scene+ Points",
    multipliers: {
      "Groceries": 1,
      "Food": 1,
      "Base": 1
    }
  },
  "Neo Mastercard": {
    currency: "Cashback",
    multipliers: {
      "Car": 0.01, // 1% cashback on gas ($0.47 on $47)
      "Food": 0,
      "Groceries": 0,
      "Base": 0
    }
  }
};

export const CATEGORIES = [
  { value: "Food", label: "Food & Dining" },
  { value: "Groceries", label: "Groceries" },
  { value: "Car", label: "Transportation & Car" },
  { value: "Health", label: "Health & Wellness" },
  { value: "Personal Items", label: "Personal Items" },
  { value: "Utilities", label: "Utilities & Bills" },
  { value: "Travel", label: "Travel" },
  { value: "Other", label: "Other" }
];

export const BUDGET_CONFIG = {
  "Food": 150,
  "Groceries": 400,
  "Car": 150,
  "Personal Items": 100,
  "Health": 200,
  "Utilities": 500,
  "Travel": 200
};
