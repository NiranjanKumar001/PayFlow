import React from 'react';
import CustomSelect from './CustomSelect';

export default function Pagination({
  totalItems,
  itemsPerPage,
  setItemsPerPage,
  currentPage,
  setCurrentPage,
}) {
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  
  if (totalItems === 0) return null;

  const startRange = (currentPage - 1) * itemsPerPage + 1;
  const endRange = Math.min(currentPage * itemsPerPage, totalItems);

  // Generate page numbers to show (e.g. max 5 around the current page)
  const getPageNumbers = () => {
    const range = [];
    const maxVisible = 5;
    let start = Math.max(1, currentPage - Math.floor(maxVisible / 2));
    let end = Math.min(totalPages, start + maxVisible - 1);

    if (end - start + 1 < maxVisible) {
      start = Math.max(1, end - maxVisible + 1);
    }

    for (let i = start; i <= end; i++) {
      range.push(i);
    }
    return range;
  };

  return (
    <div className="pagination-bar">
      <div className="pagination-info">
        Showing <span className="font-semibold">{startRange}</span> to{' '}
        <span className="font-semibold">{endRange}</span> of{' '}
        <span className="font-semibold">{totalItems}</span> entries
      </div>

      <div className="pagination-controls">
        <div className="per-page-selector">
          <span style={{ fontSize: '12px', color: 'var(--muted-foreground)' }}>Show</span>
          <CustomSelect
            size="sm"
            style={{ width: '70px' }}
            value={itemsPerPage.toString()}
            onChange={(val) => {
              setItemsPerPage(parseInt(val, 10));
              setCurrentPage(1);
            }}
            options={[
              { value: '10', label: '10' },
              { value: '25', label: '25' },
              { value: '50', label: '50' }
            ]}
          />
          <span style={{ fontSize: '12px', color: 'var(--muted-foreground)' }}>per page</span>
        </div>

        <div className="page-buttons">
          <button
            className="btn btn-sm page-btn"
            disabled={currentPage === 1}
            onClick={() => setCurrentPage(1)}
            title="First Page"
          >
            &laquo;
          </button>
          <button
            className="btn btn-sm page-btn"
            disabled={currentPage === 1}
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            title="Previous Page"
          >
            &lsaquo;
          </button>

          {getPageNumbers().map((pageNum) => (
            <button
              key={pageNum}
              className={`btn btn-sm page-btn ${pageNum === currentPage ? 'active' : ''}`}
              onClick={() => setCurrentPage(pageNum)}
            >
              {pageNum}
            </button>
          ))}

          <button
            className="btn btn-sm page-btn"
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
            title="Next Page"
          >
            &rsaquo;
          </button>
          <button
            className="btn btn-sm page-btn"
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage(totalPages)}
            title="Last Page"
          >
            &raquo;
          </button>
        </div>
      </div>
    </div>
  );
}
