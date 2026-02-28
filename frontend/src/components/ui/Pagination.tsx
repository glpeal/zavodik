import { Button } from './Button'

interface PaginationProps {
  page: number
  totalPages: number
  onPageChange: (page: number) => void
}

export function Pagination({ page, totalPages, onPageChange }: PaginationProps) {
  if (totalPages <= 1) return null

  const pages: (number | 'dots')[] = []
  const delta = 2

  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || (i >= page - delta && i <= page + delta)) {
      pages.push(i)
    } else if (pages[pages.length - 1] !== 'dots') {
      pages.push('dots')
    }
  }

  return (
    <nav className="flex items-center justify-center gap-1" aria-label="Пагинация">
      <Button variant="ghost" size="sm" disabled={page === 1} onClick={() => onPageChange(page - 1)} aria-label="Предыдущая страница">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
      </Button>
      {pages.map((p, idx) =>
        p === 'dots' ? (
          <span key={`dots-${idx}`} className="px-2 text-gray-500">...</span>
        ) : (
          <Button
            key={p}
            variant={p === page ? 'primary' : 'ghost'}
            size="sm"
            onClick={() => onPageChange(p)}
            aria-current={p === page ? 'page' : undefined}
          >
            {p}
          </Button>
        )
      )}
      <Button variant="ghost" size="sm" disabled={page === totalPages} onClick={() => onPageChange(page + 1)} aria-label="Следующая страница">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
      </Button>
    </nav>
  )
}
