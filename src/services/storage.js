// This service will fetch and push data to GitHub.
// For now, it will fetch from our local public/transactions.json

const API_KEY = import.meta.env.VITE_API_KEY || '';

export const fetchTransactions = async () => {
  try {
    const response = await fetch('/api/transactions', {
      headers: { 'x-api-key': API_KEY }
    });
    if (!response.ok) return [];
    return await response.json();
  } catch (error) {
    console.error('Failed to fetch transactions:', error);
    return [];
  }
};

export const saveTransaction = async (transaction) => {
  try {
    const response = await fetch('/api/transactions', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'x-api-key': API_KEY
      },
      body: JSON.stringify(transaction)
    });
    return response.ok;
  } catch (error) {
    console.error('Failed to save transaction:', error);
    return false;
  }
};

export const deleteTransaction = async (id) => {
  try {
    const response = await fetch(`/api/transactions/${id}`, {
      method: 'DELETE',
      headers: { 'x-api-key': API_KEY }
    });
    return response.ok;
  } catch (error) {
    console.error('Failed to delete transaction:', error);
    return false;
  }
};

export const uploadReceipt = async (file, date) => {
  try {
    const formData = new FormData();
    formData.append('receipt', file);
    formData.append('date', date);
    
    const response = await fetch('/api/upload', {
      method: 'POST',
      headers: { 'x-api-key': API_KEY },
      body: formData
    });
    
    if (response.ok) {
      const data = await response.json();
      return data.receiptUrl;
    }
    return null;
  } catch (error) {
    console.error('Failed to upload receipt:', error);
    return null;
  }
};
