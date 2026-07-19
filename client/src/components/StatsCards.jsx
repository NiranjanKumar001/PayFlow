import { useState } from 'react';
import CustomSelect from './CustomSelect';

const ShieldCheckIcon = ({ size = 16, style }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    style={{ display: 'inline-block', verticalAlign: 'middle', ...style }}
  >
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    <path d="m9 11 2 2 4-4" />
  </svg>
);

const ClockIcon = ({ size = 16, style }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    style={{ display: 'inline-block', verticalAlign: 'middle', ...style }}
  >
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
);

export default function StatsCards({ users, sales, isLoading }) {
  if (isLoading) {
    return (
      <div className="stats-row">
        {[1, 2, 3].map((i) => (
          <div key={i} className="stat-box" style={{ justifyContent: 'space-between', minHeight: '120px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', marginBottom: '8px' }}>
              <div className="skeleton-shimmer" style={{ width: '90px', height: '14px', borderRadius: '4px' }} />
              {i === 1 && <div className="skeleton-shimmer" style={{ width: '120px', height: '24px', borderRadius: '6px' }} />}
            </div>
            <div className="skeleton-shimmer" style={{ width: i === 2 ? '40px' : '140px', height: '32px', borderRadius: '6px', margin: '8px 0' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', marginTop: '4px' }}>
              <div className="skeleton-shimmer" style={{ width: '110px', height: '10px', borderRadius: '2px' }} />
              {i > 1 && <div className="skeleton-shimmer" style={{ width: '60px', height: '10px', borderRadius: '2px' }} />}
            </div>
          </div>
        ))}
      </div>
    );
  }

  const [selectedUserId, setSelectedUserId] = useState('all');

  const totalPlatformBalance = users.reduce((sum, u) => sum + u.withdrawableBalance, 0);
  const trustedCount = users.filter((u) => u.isTrusted).length;
  const probationCount = users.length - trustedCount;
  const pendingSalesCount = sales.filter((s) => s.status === 'pending').length;

  const selectedUser = users.find((u) => u._id === selectedUserId);

  return (
    <div className="stats-row">
      {/* Card 1: Affiliate Spotlight */}
      <div className="stat-box" style={{ minHeight: '120px', justifyContent: 'space-between', overflow: 'visible' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', marginBottom: '8px' }}>
          <span className="stat-label" style={{ margin: 0 }}>Affiliate Spotlight</span>
          <CustomSelect
            size="sm"
            style={{ width: '150px' }}
            value={selectedUserId}
            onChange={(val) => setSelectedUserId(val)}
            options={[
              { value: 'all', label: 'Platform Overview' },
              ...users.map((u) => ({ value: u._id, label: u.name }))
            ]}
          />
        </div>

        {selectedUserId === 'all' ? (
          <>
            <div className="stat-val">₹{totalPlatformBalance.toFixed(2)}</div>
            <div style={{ fontSize: '11px', color: 'var(--muted-foreground)', marginTop: '4px', display: 'flex', justifyContent: 'space-between' }}>
              <span>Total Platform Balance</span>
              <span>{users.length} Affiliates</span>
            </div>
          </>
        ) : selectedUser ? (
          <>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
              <div className="stat-val" style={{ color: selectedUser.withdrawableBalance < 0 ? '#ef4444' : 'inherit' }}>
                ₹{selectedUser.withdrawableBalance.toFixed(2)}
              </div>
              {selectedUser.isTrusted ? (
                <span className="badge badge-success" style={{ fontSize: '10px', padding: '2px 6px', borderRadius: '4px', textTransform: 'none', background: 'rgba(34, 197, 94, 0.1)', color: '#22c55e', border: '1px solid rgba(34, 197, 94, 0.2)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  <ShieldCheckIcon size={12} /> Trusted
                </span>
              ) : (
                <span className="badge badge-warning" style={{ fontSize: '10px', padding: '2px 6px', borderRadius: '4px', textTransform: 'none', background: 'rgba(234, 179, 8, 0.1)', color: '#eab308', border: '1px solid rgba(234, 179, 8, 0.2)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  <ClockIcon size={12} /> Probation ({selectedUser.approvedSalesCount || 0}/3)
                </span>
              )}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--muted-foreground)', marginTop: '4px' }}>
              Last Withdrawal: {selectedUser.lastWithdrawalAt ? new Date(selectedUser.lastWithdrawalAt).toLocaleTimeString() : 'Never'}
            </div>
          </>
        ) : null}
      </div>

      {/* Card 2: System Sales */}
      <div className="stat-box" style={{ justifyContent: 'space-between' }}>
        <div className="stat-label">System Sales</div>
        <div className="stat-val">{sales.length}</div>
        <div style={{ fontSize: '11px', color: 'var(--muted-foreground)', marginTop: '4px', display: 'flex', justifyContent: 'space-between' }}>
          <span>Total Sales Records</span>
          <span>Pending: {pendingSalesCount}</span>
        </div>
      </div>

      {/* Card 3: Platform Reputation Summary */}
      <div className="stat-box" style={{ justifyContent: 'space-between' }}>
        <div className="stat-label">Reputation Summary</div>
        <div className="stat-val" style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '24px', fontWeight: 600 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: '#22c55e' }}>
            <ShieldCheckIcon size={22} />
            <span>{trustedCount}</span>
          </div>
          <span style={{ fontSize: '14px', color: 'var(--muted-foreground)', fontWeight: 400 }}>vs</span>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: '#eab308' }}>
            <ClockIcon size={22} />
            <span>{probationCount}</span>
          </div>
        </div>
        <div style={{ fontSize: '11px', color: 'var(--muted-foreground)', marginTop: '4px', display: 'flex', justifyContent: 'space-between' }}>
          <span>Trusted Affiliates</span>
          <span>Probationary</span>
        </div>
      </div>
    </div>
  );
}

