"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

const defaultPageSize = 10;

export default function DataTable({
  columns,
  rows,
  rowKey,
  renderRow,
  emptyMessage,
  baseClassName = "data-table datatable",
  tableClassName = "",
  emptyColSpan,
  pageSize = defaultPageSize
}) {
  const columnCount = emptyColSpan || columns.length;
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
  const showPagination = rows.length > pageSize;

  useEffect(() => {
    setPage(1);
  }, [rows.length]);

  useEffect(() => {
    setPage((currentPage) => Math.min(currentPage, totalPages));
  }, [totalPages]);

  const visibleRows = useMemo(() => {
    const start = (page - 1) * pageSize;
    return rows.slice(start, start + pageSize);
  }, [page, pageSize, rows]);

  const startRow = rows.length ? ((page - 1) * pageSize) + 1 : 0;
  const endRow = Math.min(page * pageSize, rows.length);

  return (
    <div className="datatable-shell">
      <div className="orders-table-container datatable-container">
        <table className={`${baseClassName} ${tableClassName}`.trim()}>
          <thead>
            <tr>
              {columns.map((column) => (
                <th key={column}>{column}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visibleRows.map((row, index) => {
              const rowIndex = ((page - 1) * pageSize) + index;

              return (
                <tr key={rowKey(row, rowIndex)} style={{ "--row": index + 1 }}>
                  {renderRow(row, rowIndex)}
                </tr>
              );
            })}
            {!rows.length && (
              <tr>
                <td className="empty-table-cell" colSpan={columnCount}>{emptyMessage}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showPagination && (
        <div className="datatable-pagination">
          <span>Showing {startRow}-{endRow} of {rows.length}</span>
          <div className="datatable-pagination-controls">
            <button
              type="button"
              onClick={() => setPage((currentPage) => Math.max(1, currentPage - 1))}
              disabled={page === 1}
              aria-label="Previous table page"
            >
              <ChevronLeft />
            </button>
            {Array.from({ length: totalPages }, (_, index) => index + 1).map((pageNumber) => (
              <button
                className={pageNumber === page ? "active" : ""}
                type="button"
                key={pageNumber}
                onClick={() => setPage(pageNumber)}
                aria-label={`Go to table page ${pageNumber}`}
              >
                {pageNumber}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setPage((currentPage) => Math.min(totalPages, currentPage + 1))}
              disabled={page === totalPages}
              aria-label="Next table page"
            >
              <ChevronRight />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
