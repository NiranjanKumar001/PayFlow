import CustomSelect from './CustomSelect';

export default function SalesTable({
  sales,
  users,
  salesFilter,
  setSalesFilter,
  selectedSales,
  handleSelectAllSales,
  handleSelectSale,
  handleBulkReconcile,
  handleReconcileSale,
}) {
  return (
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
  );
}
