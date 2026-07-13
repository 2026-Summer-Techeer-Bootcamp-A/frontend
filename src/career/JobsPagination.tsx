import { ChevronLeft, ChevronRight } from 'lucide-react'

export const JOB_PAGE_SIZES = [25, 50, 100] as const
export type JobPageSize = typeof JOB_PAGE_SIZES[number]

export function parseJobPageSize(value: string | null): JobPageSize {
  const parsed = Number(value)
  return JOB_PAGE_SIZES.includes(parsed as JobPageSize) ? parsed as JobPageSize : 25
}

export function parseJobPage(value: string | null) {
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 1
}

function visiblePages(page: number, totalPages: number) {
  const start = Math.max(1, Math.min(page - 2, totalPages - 4))
  const end = Math.min(totalPages, start + 4)
  return Array.from({ length: Math.max(0, end - start + 1) }, (_, index) => start + index)
}

export default function JobsPagination({
  page,
  pageSize,
  total,
  onPageChange,
  onPageSizeChange,
}: {
  page: number
  pageSize: JobPageSize
  total: number
  onPageChange: (page: number) => void
  onPageSizeChange: (pageSize: JobPageSize) => void
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  return (
    <nav className="jobs-pagination" aria-label="공고 페이지">
      <label className="jobs-pagination__size">
        페이지당
        <select value={pageSize} onChange={(event) => onPageSizeChange(Number(event.target.value) as JobPageSize)}>
          {JOB_PAGE_SIZES.map((size) => <option key={size} value={size}>{size}개</option>)}
        </select>
      </label>
      <div className="jobs-pagination__pages">
        <button type="button" disabled={page <= 1} onClick={() => onPageChange(page - 1)} aria-label="이전 페이지">
          <ChevronLeft size={16} /> 이전
        </button>
        {visiblePages(page, totalPages).map((number) => (
          <button
            type="button"
            key={number}
            className={number === page ? 'on' : ''}
            aria-current={number === page ? 'page' : undefined}
            onClick={() => onPageChange(number)}
          >
            {number}
          </button>
        ))}
        <button type="button" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)} aria-label="다음 페이지">
          다음 <ChevronRight size={16} />
        </button>
      </div>
    </nav>
  )
}
