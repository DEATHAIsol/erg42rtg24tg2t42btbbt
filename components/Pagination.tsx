'use client'

import { ChevronLeft, ChevronRight } from 'lucide-react'

interface PaginationProps {
  currentPage: number
  totalPages: number
  onPageChange: (page: number) => void
  itemsPerPage: number
  totalItems: number
}

export function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  itemsPerPage,
  totalItems,
}: PaginationProps) {
  const startItem = (currentPage - 1) * itemsPerPage + 1
  const endItem = Math.min(currentPage * itemsPerPage, totalItems)

  const getPageNumbers = () => {
    const pages: (number | string)[] = []
    const maxVisible = 5

    if (totalPages <= maxVisible) {
      // Show all pages if total is less than max visible
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i)
      }
    } else {
      // Always show first page
      pages.push(1)

      if (currentPage > 3) {
        pages.push('...')
      }

      // Show pages around current page
      const start = Math.max(2, currentPage - 1)
      const end = Math.min(totalPages - 1, currentPage + 1)

      for (let i = start; i <= end; i++) {
        pages.push(i)
      }

      if (currentPage < totalPages - 2) {
        pages.push('...')
      }

      // Always show last page
      pages.push(totalPages)
    }

    return pages
  }

  return (
    <div className="flex items-center justify-between px-4 py-3 border-t border-terminal-border bg-terminal-surface">
      <div className="text-sm text-terminal-text-secondary">
        Showing <span className="font-medium text-terminal-text-primary">{startItem}</span> to{' '}
        <span className="font-medium text-terminal-text-primary">{endItem}</span> of{' '}
        <span className="font-medium text-terminal-text-primary">{totalItems}</span> markets
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className={`p-2 rounded transition-colors ${
            currentPage === 1
              ? 'text-terminal-text-muted cursor-not-allowed opacity-50'
              : 'text-terminal-text-secondary hover:text-terminal-text-primary hover:bg-terminal-border'
          }`}
        >
          <ChevronLeft size={18} />
        </button>

        <div className="flex items-center gap-1">
          {getPageNumbers().map((page, index) => {
            if (page === '...') {
              return (
                <span key={`ellipsis-${index}`} className="px-2 text-terminal-text-secondary">
                  ...
                </span>
              )
            }

            const pageNum = page as number
            return (
              <button
                key={pageNum}
                onClick={() => onPageChange(pageNum)}
                className={`px-3 py-1 rounded text-sm transition-colors ${
                  currentPage === pageNum
                    ? 'bg-terminal-accent text-white'
                    : 'text-terminal-text-secondary hover:text-terminal-text-primary hover:bg-terminal-border'
                }`}
              >
                {pageNum}
              </button>
            )
          })}
        </div>

        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className={`p-2 rounded transition-colors ${
            currentPage === totalPages
              ? 'text-terminal-text-muted cursor-not-allowed opacity-50'
              : 'text-terminal-text-secondary hover:text-terminal-text-primary hover:bg-terminal-border'
          }`}
        >
          <ChevronRight size={18} />
        </button>
      </div>
    </div>
  )
}




