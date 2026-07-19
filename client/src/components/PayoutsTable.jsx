import CustomSelect from './CustomSelect';

export default function PayoutsTable({
  payouts,
  users,
  payoutsFilter,
  setPayoutsFilter,
  handlePayoutStatusUpdate,
}) {
  return (
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
  );
}
