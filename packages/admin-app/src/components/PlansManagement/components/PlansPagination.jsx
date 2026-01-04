'use client';

import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { PAGINATION } from '../utils/helpers';

/**
 * Pagination controls with rows per page selector
 */
const PlansPagination = ({
  currentPage,
  totalPages,
  totalItems,
  rowsPerPage,
  onPageChange,
  onRowsPerPageChange,
  dataSource,
  isRTL,
  t
}) => {
  const indexOfFirstItem = (currentPage - 1) * rowsPerPage + 1;
  const indexOfLastItem = Math.min(currentPage * rowsPerPage, totalItems);

  const handlePreviousPage = () => {
    if (currentPage > 1) {
      onPageChange(currentPage - 1);
    }
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      onPageChange(currentPage + 1);
    }
  };

  // Generate page numbers to show
  const getPageNumbers = () => {
    const pages = [];
    for (let i = 1; i <= totalPages; i++) {
      const shouldShow =
        i === 1 ||
        i === totalPages ||
        Math.abs(i - currentPage) <= 1;

      if (shouldShow) {
        pages.push({ type: 'page', number: i });
      } else if (i === 2 && currentPage > 3) {
        pages.push({ type: 'ellipsis', key: 'start' });
      } else if (i === totalPages - 1 && currentPage < totalPages - 2) {
        pages.push({ type: 'ellipsis', key: 'end' });
      }
    }

    // Remove duplicate ellipses
    return pages.filter((page, index, arr) => {
      if (page.type === 'ellipsis') {
        return !arr.slice(0, index).some(p => p.type === 'ellipsis' && p.key === page.key);
      }
      return true;
    });
  };

  if (totalItems <= rowsPerPage && totalPages <= 1) {
    return null;
  }

  return (
    <div className="bg-white border border-gray-200 px-4 py-3 flex items-center justify-between sm:px-6 rounded-lg">
      {/* Mobile view */}
      <div className="flex-1 flex justify-between sm:hidden">
        <button
          onClick={handlePreviousPage}
          disabled={currentPage === 1}
          className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {t?.('plansManagement.previous', 'Previous') || 'Previous'}
        </button>
        <button
          onClick={handleNextPage}
          disabled={currentPage === totalPages}
          className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {t?.('plansManagement.next', 'Next') || 'Next'}
        </button>
      </div>

      {/* Desktop view */}
      <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <p className={`text-sm text-gray-700 ${isRTL ? 'text-right' : 'text-left'}`}>
            {t?.('plansManagement.showing', 'Showing {{start}} to {{end}} of {{total}} results', {
              start: indexOfFirstItem,
              end: indexOfLastItem,
              total: totalItems
            }) || `Showing ${indexOfFirstItem} to ${indexOfLastItem} of ${totalItems} results`}
          </p>

          {/* Rows per page selector for Supabase */}
          {dataSource === 'supabase' && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">Rows per page:</span>
              <select
                value={rowsPerPage}
                onChange={(e) => onRowsPerPageChange(parseInt(e.target.value, 10))}
                className="px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                {PAGINATION.ROWS_PER_PAGE_OPTIONS.map(option => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div>
          <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
            {/* Previous button */}
            <button
              onClick={handlePreviousPage}
              disabled={currentPage === 1}
              className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span className="sr-only">Previous</span>
              <ChevronLeft className="h-5 w-5" aria-hidden="true" />
            </button>

            {/* Page numbers */}
            {getPageNumbers().map((item, index) => {
              if (item.type === 'ellipsis') {
                return (
                  <span
                    key={`ellipsis-${item.key}`}
                    className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700"
                  >
                    ...
                  </span>
                );
              }

              return (
                <button
                  key={item.number}
                  onClick={() => onPageChange(item.number)}
                  className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                    item.number === currentPage
                      ? 'z-10 bg-gray-900 border-gray-900 text-white'
                      : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                  }`}
                >
                  {item.number}
                </button>
              );
            })}

            {/* Next button */}
            <button
              onClick={handleNextPage}
              disabled={currentPage === totalPages}
              className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span className="sr-only">Next</span>
              <ChevronRight className="h-5 w-5" aria-hidden="true" />
            </button>
          </nav>
        </div>
      </div>
    </div>
  );
};

export default PlansPagination;
