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

import { useState } from 'react';
import Pagination from './Pagination';

export default function UsersTable({ users, isLoading, handleTerminateUser }) {
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Auto-adjust page if current page is out of bounds after search/filter/update
  const maxPage = Math.max(1, Math.ceil(users.length / itemsPerPage));
  const activePage = currentPage > maxPage ? maxPage : currentPage;

  const paginatedUsers = users.slice(
    (activePage - 1) * itemsPerPage,
    activePage * itemsPerPage
  );
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
              <th style={{ width: '100px', minWidth: '100px', textAlign: 'center' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, idx) => (
                <tr key={idx}>
                  <td>
                    <div className="skeleton-shimmer" style={{ width: '150px', height: '14px', borderRadius: '4px' }} />
                  </td>
                  <td>
                    <div className="skeleton-shimmer" style={{ width: '100px', height: '14px', borderRadius: '4px' }} />
                  </td>
                  <td>
                    <div className="skeleton-shimmer" style={{ width: '90px', height: '18px', borderRadius: '4px' }} />
                  </td>
                  <td>
                    <div className="skeleton-shimmer" style={{ width: '70px', height: '14px', borderRadius: '4px' }} />
                  </td>
                  <td>
                    <div className="skeleton-shimmer" style={{ width: '140px', height: '14px', borderRadius: '4px' }} />
                  </td>
                  <td>
                    <div className="skeleton-shimmer" style={{ width: '80px', height: '24px', borderRadius: '4px' }} />
                  </td>
                </tr>
              ))
            ) : users.length === 0 ? (
              <tr>
                <td colSpan="6" style={{ textAlign: 'center', color: 'hsl(var(--text-secondary))' }}>
                  No users recorded.
                </td>
              </tr>
            ) : (
              paginatedUsers.map((u) => (
              <tr key={u._id} style={u.isTerminated ? { opacity: 0.65 } : {}}>
                <td style={{ fontFamily: 'monospace' }}>{u._id}</td>
                <td style={{ fontWeight: 600, textDecoration: u.isTerminated ? 'line-through' : 'none' }}>{u.name}</td>
                <td>
                  {u.isTerminated ? (
                    <span style={{ color: 'hsl(var(--text-secondary))', fontSize: '12px' }}>Inactive</span>
                  ) : u.isTrusted ? (
                    <span style={{ color: '#22c55e', fontSize: '12px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      <ShieldCheckIcon size={14} /> Trusted
                    </span>
                  ) : (
                    <span style={{ color: '#eab308', fontSize: '12px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      <ClockIcon size={14} /> Probation ({u.approvedSalesCount || 0}/3)
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
                <td style={{ minWidth: '100px', textAlign: 'center' }}>
                  {u.isTerminated ? (
                    <span
                      className="badge-terminated"
                      style={{
                        display: 'inline-block',
                        padding: '4px 8px',
                        fontSize: '11px',
                        borderRadius: '4px',
                        textAlign: 'center',
                        width: '74px',
                        boxSizing: 'border-box'
                      }}
                    >
                      Terminated
                    </span>
                  ) : (
                    <button
                      className="btn btn-terminate"
                      style={{
                        padding: '4px 8px',
                        fontSize: '11px',
                        borderRadius: '4px',
                        width: '74px',
                        height: '22px',
                        boxSizing: 'border-box',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                      onClick={() => {
                        if (confirm(`Are you sure you want to terminate affiliate user ${u.name}?`)) {
                          handleTerminateUser(u._id);
                        }
                      }}
                    >
                      Terminate
                    </button>
                  )}
                </td>
              </tr>
            ))
            )}
          </tbody>
        </table>
      </div>
      <Pagination
        totalItems={users.length}
        itemsPerPage={itemsPerPage}
        setItemsPerPage={setItemsPerPage}
        currentPage={activePage}
        setCurrentPage={setCurrentPage}
      />
    </div>
  );
}
