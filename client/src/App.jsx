import { useState, useEffect, useRef } from 'react';
import { api } from './services/api';
import './App.css';

function CustomSelect({ value, onChange, options, placeholder = "Select option", size = "md", style }) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedOption = options.find(opt => opt.value === value);

  return (
    <div className={`custom-select-container ${size}`} ref={dropdownRef} style={style}>
      <div className="custom-select-trigger" onClick={() => setIsOpen(!isOpen)}>
        <span>{selectedOption ? selectedOption.label : placeholder}</span>
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`chevron ${isOpen ? 'open' : ''}`}>
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </div>
      {isOpen && (
        <div className="custom-select-options">
          {options.map((opt) => (
            <div
              key={opt.value}
              className={`custom-select-option ${opt.value === value ? 'selected' : ''}`}
              onClick={() => {
                onChange(opt.value);
                setIsOpen(false);
              }}
            >
              {opt.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function App() {
  const [users, setUsers] = useState([]);
  const [sales, setSales] = useState([]);
  const [payouts, setPayouts] = useState([]);
  const [activeTab, setActiveTab] = useState('sales');

  // Filters
  const [salesFilter, setSalesFilter] = useState({ userId: '', status: '' });
  const [payoutsFilter, setPayoutsFilter] = useState({ userId: '' });

  // Forms
  const [newSale, setNewSale] = useState({ userId: 'john_doe', brand: 'brand_1', earning: '' });
  const [newWithdrawal, setNewWithdrawal] = useState({ userId: 'john_doe', amount: '' });

  // Selections for Bulk Actions
  const [selectedSales, setSelectedSales] = useState([]);

  // Notifications
  const [toast, setToast] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch all data
  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [fetchedUsers, fetchedSales, fetchedPayouts] = await Promise.all([
        api.getUsers(),
        api.getSales(salesFilter),
        api.getPayouts(payoutsFilter.userId),
      ]);
      setUsers(fetchedUsers);
      setSales(fetchedSales);
      setPayouts(fetchedPayouts);
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [salesFilter, payoutsFilter]);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 4000);
  };

  // ─── Actions ──────────────────────────────────────────────────────────────

  const handleCreateSale = async (e) => {
    e.preventDefault();
    if (!newSale.earning || parseFloat(newSale.earning) <= 0) {
      showToast('Earning must be a positive number', 'error');
      return;
    }
    try {
      await api.createSale({
        userId: newSale.userId,
        brand: newSale.brand,
        earning: parseFloat(newSale.earning),
      });
      showToast('Sale created successfully');
      setNewSale({ ...newSale, earning: '' });
      fetchData();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleWithdrawal = async (e) => {
    e.preventDefault();
    if (!newWithdrawal.amount || parseFloat(newWithdrawal.amount) <= 0) {
      showToast('Withdrawal amount must be a positive number', 'error');
      return;
    }
    try {
      await api.withdraw(newWithdrawal.userId, parseFloat(newWithdrawal.amount));
      showToast('Withdrawal initiated successfully');
      setNewWithdrawal({ ...newWithdrawal, amount: '' });
      fetchData();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleRunAdvancePayoutJob = async () => {
    try {
      const res = await api.runAdvancePayoutJob();
      if (res.processed > 0) {
        showToast(`Job ran: processed ${res.processed} sales. Paid: ₹${res.totalAdvance} advance.`);
      } else {
        showToast('Job ran: no eligible pending sales found.', 'success');
      }
      fetchData();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleReconcileSale = async (saleId, status) => {
    try {
      await api.reconcileSale(saleId, status);
      showToast(`Sale reconciled as ${status}`);
      setSelectedSales((prev) => prev.filter((id) => id !== saleId));
      fetchData();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleBulkReconcile = async (status) => {
    if (selectedSales.length === 0) return;
    try {
      await api.reconcileBulk(selectedSales, status);
      showToast(`Reconciled ${selectedSales.length} sales as ${status}`);
      setSelectedSales([]);
      fetchData();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handlePayoutStatusUpdate = async (payoutId, status) => {
    try {
      await api.updatePayoutStatus(payoutId, status);
      showToast(`Payout status updated to ${status}. Recovered successfully!`);
      fetchData();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  // Toggle selection for bulk reconcile
  const handleSelectSale = (saleId) => {
    setSelectedSales((prev) =>
      prev.includes(saleId) ? prev.filter((id) => id !== saleId) : [...prev, saleId]
    );
  };

  const handleSelectAllSales = () => {
    const pendingSales = sales.filter((s) => s.status === 'pending');
    if (selectedSales.length === pendingSales.length) {
      setSelectedSales([]);
    } else {
      setSelectedSales(pendingSales.map((s) => s._id));
    }
  };

  return (
    <>
      {toast && (
        <div className={`toast-msg toast-${toast.type}`}>
          {toast.type === 'success' ? (
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '8px', color: '#10b981', flexShrink: 0 }}>
              <polyline points="20 6 9 17 4 12" />
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '8px', color: '#ef4444', flexShrink: 0 }}>
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          )}
          {toast.message}
        </div>
      )}

      {/* Header */}
      <header className="app-header">
        <div className="logo-container">
          <div className="logo-icon">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 3h12" />
              <path d="M6 8h12" />
              <path d="m6 13 8.5 8" />
              <path d="M6 13h3" />
              <path d="M9 13c0-3.5 2.5-6 6-6" />
            </svg>
          </div>
          <div>
            <div className="logo-text">PayFlow</div>
            <div style={{ fontSize: '11px', color: 'hsl(var(--text-secondary))' }}>
              Affiliate Payout Dashboard
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <button className="btn btn-primary" onClick={handleRunAdvancePayoutJob}>
            Run Advance Job (10%)
          </button>
          
          <div className="tabs-container">
            <button
              className={`tab-btn ${activeTab === 'sales' ? 'active' : ''}`}
              onClick={() => setActiveTab('sales')}
            >
              Sales
            </button>
            <button
              className={`tab-btn ${activeTab === 'users' ? 'active' : ''}`}
              onClick={() => setActiveTab('users')}
            >
              Users
            </button>
            <button
              className={`tab-btn ${activeTab === 'payouts' ? 'active' : ''}`}
              onClick={() => setActiveTab('payouts')}
            >
              Payouts Ledger
            </button>
          </div>
        </div>
      </header>

      {/* Stats row banner */}
      <div className="stats-row">
        {users.map((u) => (
          <div key={u._id} className="stat-box">
            <div className="stat-label">{u.name} Balance</div>
            <div className="stat-val" style={{ color: u.withdrawableBalance < 0 ? 'hsl(var(--danger-hsl))' : 'inherit' }}>
              ₹{u.withdrawableBalance.toFixed(2)}
            </div>
            <div style={{ fontSize: '11px', color: 'hsl(var(--text-secondary))', marginTop: '4px' }}>
              Last Withdrawal: {u.lastWithdrawalAt ? new Date(u.lastWithdrawalAt).toLocaleTimeString() : 'Never'}
            </div>
          </div>
        ))}
        <div className="stat-box">
          <div className="stat-label">System Sales</div>
          <div className="stat-val">{sales.length}</div>
          <div style={{ fontSize: '11px', color: 'hsl(var(--text-secondary))', marginTop: '4px' }}>
            Pending: {sales.filter(s => s.status === 'pending').length}
          </div>
        </div>
      </div>

      {/* Main Grid */}
      <div className="dashboard-grid">
        {/* Left Side: Dynamic Tab Content */}
        <div className="main-content-column">
          {activeTab === 'sales' && (
            <div className="card">
              <div className="card-title">
                <span>Affiliate Sales</span>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <CustomSelect
                    size="sm"
                    style={{ width: '130px' }}
                    value={salesFilter.userId}
                    onChange={(val) => setSalesFilter({ ...salesFilter, userId: val })}
                    options={[
                      { value: '', label: 'All Users' },
                      ...users.map((u) => ({ value: u._id, label: u.name }))
                    ]}
                  />
                  <CustomSelect
                    size="sm"
                    style={{ width: '130px' }}
                    value={salesFilter.status}
                    onChange={(val) => setSalesFilter({ ...salesFilter, status: val })}
                    options={[
                      { value: '', label: 'All Statuses' },
                      { value: 'pending', label: 'Pending' },
                      { value: 'approved', label: 'Approved' },
                      { value: 'rejected', label: 'Rejected' }
                    ]}
                  />
                </div>
              </div>

              {/* Bulk Actions Banner */}
              {selectedSales.length > 0 && (
                <div className="bulk-actions-banner">
                  <span style={{ fontSize: '14px', fontWeight: 600 }}>
                    Selected {selectedSales.length} pending sale{selectedSales.length > 1 ? 's' : ''}
                  </span>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      className="btn btn-success btn-sm"
                      onClick={() => handleBulkReconcile('approved')}
                    >
                      Approve Selected
                    </button>
                    <button
                      className="btn btn-danger btn-sm"
                      onClick={() => handleBulkReconcile('rejected')}
                    >
                      Reject Selected
                    </button>
                  </div>
                </div>
              )}

              <div className="table-container">
                <table className="premium-table">
                  <thead>
                    <tr>
                      <th className="checkbox-cell">
                        <input
                          type="checkbox"
                          className="checkbox-custom"
                          checked={
                            sales.filter((s) => s.status === 'pending').length > 0 &&
                            selectedSales.length === sales.filter((s) => s.status === 'pending').length
                          }
                          onChange={handleSelectAllSales}
                        />
                      </th>
                      <th>Sale ID</th>
                      <th>User</th>
                      <th>Brand</th>
                      <th>Earning</th>
                      <th>Advance status</th>
                      <th>Advance</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sales.length === 0 ? (
                      <tr>
                        <td colSpan="9" style={{ textAlign: 'center', color: 'hsl(var(--text-secondary))' }}>
                          No sales records found.
                        </td>
                      </tr>
                    ) : (
                      sales.map((sale) => (
                        <tr key={sale._id}>
                          <td className="checkbox-cell">
                            <input
                              type="checkbox"
                              className="checkbox-custom"
                              disabled={sale.status !== 'pending'}
                              checked={selectedSales.includes(sale._id)}
                              onChange={() => handleSelectSale(sale._id)}
                            />
                          </td>
                          <td style={{ fontFamily: 'monospace', fontSize: '12px' }}>
                            {sale._id.slice(-8)}
                          </td>
                          <td>{sale.userId}</td>
                          <td>{sale.brand.replace('_', ' ')}</td>
                          <td>₹{sale.earning.toFixed(2)}</td>
                          <td>
                            <span className={`badge badge-${sale.advanceStatus}`}>
                              {sale.advanceStatus}
                            </span>
                          </td>
                          <td>₹{sale.advanceAmount.toFixed(2)}</td>
                          <td>
                            <span className={`badge badge-${sale.status}`}>{sale.status}</span>
                          </td>
                          <td>
                            {sale.status === 'pending' ? (
                              <div style={{ display: 'flex', gap: '6px' }}>
                                <button
                                  className="btn btn-success btn-sm"
                                  onClick={() => handleReconcileSale(sale._id, 'approved')}
                                >
                                  Approve
                                </button>
                                <button
                                  className="btn btn-danger btn-sm"
                                  onClick={() => handleReconcileSale(sale._id, 'rejected')}
                                >
                                  Reject
                                </button>
                              </div>
                            ) : (
                              <span style={{ fontSize: '12px', color: 'hsl(var(--text-muted))' }}>
                                Reconciled
                              </span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'users' && (
            <div className="card">
              <div className="card-title">Users Directory</div>
              <div className="table-container">
                <table className="premium-table">
                  <thead>
                    <tr>
                      <th>User ID</th>
                      <th>Name</th>
                      <th>Withdrawable Balance</th>
                      <th>Last Withdrawal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u) => (
                      <tr key={u._id}>
                        <td style={{ fontFamily: 'monospace' }}>{u._id}</td>
                        <td style={{ fontWeight: 600 }}>{u.name}</td>
                        <td style={{ color: u.withdrawableBalance < 0 ? 'hsl(var(--danger-hsl))' : 'inherit', fontWeight: 700 }}>
                          ₹{u.withdrawableBalance.toFixed(2)}
                        </td>
                        <td>
                          {u.lastWithdrawalAt
                            ? new Date(u.lastWithdrawalAt).toLocaleString()
                            : 'No withdrawals yet'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'payouts' && (
            <div className="card">
              <div className="card-title">
                <span>Payout Transaction Ledger</span>
                <CustomSelect
                  size="sm"
                  style={{ width: '150px' }}
                  value={payoutsFilter.userId}
                  onChange={(val) => setPayoutsFilter({ userId: val })}
                  options={[
                    { value: '', label: 'All Users' },
                    ...users.map((u) => ({ value: u._id, label: u.name }))
                  ]}
                />
              </div>

              <div className="table-container">
                <table className="premium-table">
                  <thead>
                    <tr>
                      <th>Transaction ID</th>
                      <th>User</th>
                      <th>Type</th>
                      <th>Amount</th>
                      <th>Status</th>
                      <th>Ref ID</th>
                      <th>Timestamp</th>
                      <th>Simulations</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payouts.length === 0 ? (
                      <tr>
                        <td colSpan="8" style={{ textAlign: 'center', color: 'hsl(var(--text-secondary))' }}>
                          No payout transactions recorded.
                        </td>
                      </tr>
                    ) : (
                      payouts.map((p) => (
                        <tr key={p._id}>
                          <td style={{ fontFamily: 'monospace', fontSize: '12px' }}>
                            {p._id.slice(-8)}
                          </td>
                          <td>{p.userId}</td>
                          <td>
                            <span style={{ textTransform: 'capitalize' }}>
                              {p.type.replace('_', ' ')}
                            </span>
                          </td>
                          <td style={{ color: p.amount < 0 ? 'hsl(var(--danger-hsl))' : 'inherit', fontWeight: 700 }}>
                            {p.amount < 0 ? '-' : ''}₹{Math.abs(p.amount).toFixed(2)}
                          </td>
                          <td>
                            <span className={`badge badge-${p.status}`}>{p.status}</span>
                          </td>
                          <td style={{ fontFamily: 'monospace', fontSize: '12px' }}>
                            {p.referenceId ? p.referenceId.slice(-8) : '-'}
                          </td>
                          <td>{new Date(p.createdAt).toLocaleTimeString()}</td>
                          <td>
                            {p.type === 'withdrawal' && p.status === 'completed' ? (
                              <div style={{ display: 'flex', gap: '6px' }}>
                                <button
                                  className="btn btn-danger btn-sm"
                                  onClick={() => handlePayoutStatusUpdate(p._id, 'failed')}
                                >
                                  Simulate Fail
                                </button>
                                <button
                                  className="btn btn-sm"
                                  style={{ background: 'rgba(255, 255, 255, 0.05)' }}
                                  onClick={() => handlePayoutStatusUpdate(p._id, 'cancelled')}
                                >
                                  Cancel
                                </button>
                              </div>
                            ) : (
                              <span style={{ fontSize: '11px', color: 'hsl(var(--text-muted))' }}>
                                None
                              </span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Right Side: Interactive Quick Actions Panels */}
        <div className="sidebar-column">
          {/* Add Sale Panel */}
          <div className="card">
            <div className="card-title">Register Affiliate Sale</div>
            <form onSubmit={handleCreateSale}>
              <div className="form-group">
                <label className="form-label">Affiliate User</label>
                <CustomSelect
                  value={newSale.userId}
                  onChange={(val) => setNewSale({ ...newSale, userId: val })}
                  options={users.map((u) => ({ value: u._id, label: u.name }))}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Brand</label>
                <CustomSelect
                  value={newSale.brand}
                  onChange={(val) => setNewSale({ ...newSale, brand: val })}
                  options={[
                    { value: 'brand_1', label: 'Brand 1' },
                    { value: 'brand_2', label: 'Brand 2' },
                    { value: 'brand_3', label: 'Brand 3' }
                  ]}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Earning Amount (₹)</label>
                <input
                  type="number"
                  step="0.01"
                  className="form-control"
                  placeholder="e.g. 150.00"
                  value={newSale.earning}
                  onChange={(e) => setNewSale({ ...newSale, earning: e.target.value })}
                  required
                />
              </div>

              <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }}>
                Create Sale Record
              </button>
            </form>
          </div>

          {/* Withdraw Panel */}
          <div className="card">
            <div className="card-title">Withdraw Balance</div>
            <form onSubmit={handleWithdrawal}>
              <div className="form-group">
                <label className="form-label">Affiliate User</label>
                <CustomSelect
                  value={newWithdrawal.userId}
                  onChange={(val) => setNewWithdrawal({ ...newWithdrawal, userId: val })}
                  options={users.map((u) => ({
                    value: u._id,
                    label: `${u.name} (Bal: ₹${u.withdrawableBalance.toFixed(2)})`
                  }))}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Withdrawal Amount (₹)</label>
                <input
                  type="number"
                  step="0.01"
                  className="form-control"
                  placeholder="e.g. 50.00"
                  value={newWithdrawal.amount}
                  onChange={(e) => setNewWithdrawal({ ...newWithdrawal, amount: e.target.value })}
                  required
                />
              </div>

              <button type="submit" className="btn btn-success" style={{ width: '100%', justifyContent: 'center' }}>
                Initiate Withdrawal
              </button>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}

export default App;
