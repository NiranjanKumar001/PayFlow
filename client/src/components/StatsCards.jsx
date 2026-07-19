export default function StatsCards({ users, sales }) {
  return (
    <div className="stats-row">
      {users.map((u) => (
        <div key={u._id} className="stat-box">
          <div className="stat-label" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
            <span>{u.name} Balance</span>
            {u.isTrusted ? (
              <span className="badge badge-success" style={{ fontSize: '10px', padding: '2px 6px', borderRadius: '4px', textTransform: 'none', background: 'rgba(34, 197, 94, 0.1)', color: '#22c55e', border: '1px solid rgba(34, 197, 94, 0.2)', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                🛡️ Trusted
              </span>
            ) : (
              <span className="badge badge-warning" style={{ fontSize: '10px', padding: '2px 6px', borderRadius: '4px', textTransform: 'none', background: 'rgba(234, 179, 8, 0.1)', color: '#eab308', border: '1px solid rgba(234, 179, 8, 0.2)', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                ⏳ Probation ({u.approvedSalesCount || 0}/3)
              </span>
            )}
          </div>
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
  );
}
