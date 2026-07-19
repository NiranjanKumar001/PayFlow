const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';

async function handleResponse(response) {
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const error = new Error(errorData.error || `HTTP error! status: ${response.status}`);
    error.status = response.status;
    throw error;
  }
  return response.json();
}

export const api = {
  // Users
  getUsers: () => fetch(`${API_BASE}/users`).then(handleResponse),
  createUser: (userData) =>
    fetch(`${API_BASE}/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData),
    }).then(handleResponse),
  withdraw: (userId, amount) =>
    fetch(`${API_BASE}/users/${userId}/withdraw`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount }),
    }).then(handleResponse),
  terminateUser: (userId) =>
    fetch(`${API_BASE}/users/${userId}/terminate`, {
      method: 'POST',
    }).then(handleResponse),

  // Sales
  getSales: (filters = {}) => {
    const params = new URLSearchParams();
    if (filters.userId) params.append('userId', filters.userId);
    if (filters.status) params.append('status', filters.status);
    const queryString = params.toString() ? `?${params.toString()}` : '';
    return fetch(`${API_BASE}/sales${queryString}`).then(handleResponse);
  },
  createSale: (saleData) =>
    fetch(`${API_BASE}/sales`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(saleData),
    }).then(handleResponse),
  reconcileSale: (saleId, status) =>
    fetch(`${API_BASE}/sales/${saleId}/reconcile`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    }).then(handleResponse),
  reconcileBulk: (saleIds, status) =>
    fetch(`${API_BASE}/sales/reconcile`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ saleIds, status }),
    }).then(handleResponse),

  // Payouts
  getPayouts: (userId) => {
    const url = userId ? `${API_BASE}/payouts?userId=${userId}` : `${API_BASE}/payouts`;
    return fetch(url).then(handleResponse);
  },
  updatePayoutStatus: (payoutId, status) =>
    fetch(`${API_BASE}/payouts/${payoutId}/status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    }).then(handleResponse),

  // Jobs
  runAdvancePayoutJob: () =>
    fetch(`${API_BASE}/jobs/advance-payout`, {
      method: 'POST',
    }).then(handleResponse),
};
