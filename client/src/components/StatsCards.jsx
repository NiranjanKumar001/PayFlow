export default function StatsCards({ users, sales }) {
  return (
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
  );
}
