export default function Header({ activeTab, setActiveTab, handleRunAdvancePayoutJob }) {
  return (
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
  );
}
