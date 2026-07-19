import { useState } from 'react';
import CustomSelect from './CustomSelect';

export default function StatsCards({ users, sales }) {
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
                <span className="badge badge-success" style={{ fontSize: '10px', padding: '2px 6px', borderRadius: '4px', textTransform: 'none', background: 'rgba(34, 197, 94, 0.1)', color: '#22c55e', border: '1px solid rgba(34, 197, 94, 0.2)', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                  🛡️ Trusted
                </span>
              ) : (
                <span className="badge badge-warning" style={{ fontSize: '10px', padding: '2px 6px', borderRadius: '4px', textTransform: 'none', background: 'rgba(234, 179, 8, 0.1)', color: '#eab308', border: '1px solid rgba(234, 179, 8, 0.2)', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                  ⏳ Probation ({selectedUser.approvedSalesCount || 0}/3)
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
        <div className="stat-val" style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '24px' }}>
          <span>🛡️ {trustedCount}</span>
          <span style={{ fontSize: '14px', color: 'var(--muted-foreground)' }}>vs</span>
          <span>⏳ {probationCount}</span>
        </div>
        <div style={{ fontSize: '11px', color: 'var(--muted-foreground)', marginTop: '4px', display: 'flex', justifyContent: 'space-between' }}>
          <span>Trusted Affiliates</span>
          <span>Probationary</span>
        </div>
      </div>
    </div>
  );
}

