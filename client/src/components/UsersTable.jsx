export default function UsersTable({ users }) {
  return (
    <div className="card">
      <div className="card-title">Users Directory</div>
      <div className="table-container">
        <table className="premium-table">
          <thead>
            <tr>
              <th>User ID</th>
              <th>Name</th>
              <th>Trust Status</th>
              <th>Withdrawable Balance</th>
              <th>Last Withdrawal</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u._id}>
                <td style={{ fontFamily: 'monospace' }}>{u._id}</td>
                <td style={{ fontWeight: 600 }}>{u.name}</td>
                <td>
                  {u.isTrusted ? (
                    <span style={{ color: '#22c55e', fontSize: '12px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      🛡️ Trusted
                    </span>
                  ) : (
                    <span style={{ color: '#eab308', fontSize: '12px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      ⏳ Probation ({u.approvedSalesCount || 0}/3)
                    </span>
                  )}
                </td>
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
  );
}
