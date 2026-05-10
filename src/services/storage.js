// This service will fetch and push data to GitHub.
// For now, it will fetch from our local public/transactions.json

export const fetchTransactions = async () => {
  try {
    const response = await fetch('/api/transactions');
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
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(transaction)
    });
    return response.ok;
  } catch (error) {
    console.error('Failed to save transaction:', error);
    return false;
  }
};

export const deleteTransaction = async (index) => {
  try {
    const response = await fetch(`/api/transactions/${index}`, {
      method: 'DELETE'
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
