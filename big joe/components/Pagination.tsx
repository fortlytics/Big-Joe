import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationProps {
  page: number;
  totalPages: number;
  /** Current search params, so filters survive a page change. */
  searchParams: Record<string, string | undefined>;
}

function hrefFor(page: number, searchParams: Record<string, string | undefined>): string {
  const params = new URLSearchParams();
  Object.entries(searchParams).forEach(([k, v]) => {
    if (v && k !== 'page') params.set(k, v);
  });
  if (page > 1) params.set('page', String(page));
  const qs = params.toString();
  return `/inventory${qs ? `?${qs}` : ''}`;
}

export function Pagination({ page, totalPages, searchParams }: PaginationProps) {
  if (totalPages <= 1) return null;

  // Compact window of page numbers around the current page.
  const pages: number[] = [];
  const windowSize = 1;
  for (let p = Math.max(1, page - windowSize); p <= Math.min(totalPages, page + windowSize); p++) {
    pages.push(p);
  }

  return (
    <nav aria-label="Pagination" className="mt-12 flex items-center justify-center gap-1.5">
      <Link
        href={hrefFor(Math.max(1, page - 1), searchParams)}
        aria-disabled={page === 1}
        className={`flex h-10 items-center gap-1 rounded-full border border-edge px-4 text-sm font-medium transition-colors ${
          page === 1 ? 'pointer-events-none opacity-30' : 'text-ink hover:border-red/50 hover:text-red-glow'
        }`}
      >
        <ChevronLeft size={15} /> Prev
      </Link>

      {pages[0] > 1 && (
        <>
          <Link href={hrefFor(1, searchParams)} className="flex h-10 w-10 items-center justify-center rounded-full text-sm text-mute hover:bg-surface2 hover:text-ink">1</Link>
          {pages[0] > 2 && <span className="px-1 text-mute">…</span>}
        </>
      )}

      {pages.map((p) => (
        <Link
          key={p}
          href={hrefFor(p, searchParams)}
          className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-semibold transition-all ${
            p === page
              ? 'bg-gradient-to-br from-red to-red-glow text-white shadow-[0_4px_14px_rgba(220,38,38,0.4)]'
              : 'text-ink hover:bg-surface2'
          }`}
          aria-current={p === page ? 'page' : undefined}
        >
          {p}
        </Link>
      ))}

      {pages[pages.length - 1] < totalPages && (
        <>
          {pages[pages.length - 1] < totalPages - 1 && <span className="px-1 text-mute">…</span>}
          <Link href={hrefFor(totalPages, searchParams)} className="flex h-10 w-10 items-center justify-center rounded-full text-sm text-mute hover:bg-surface2 hover:text-ink">
            {totalPages}
          </Link>
        </>
      )}

      <Link
        href={hrefFor(Math.min(totalPages, page + 1), searchParams)}
        aria-disabled={page === totalPages}
        className={`flex h-10 items-center gap-1 rounded-full border border-edge px-4 text-sm font-medium transition-colors ${
          page === totalPages ? 'pointer-events-none opacity-30' : 'text-ink hover:border-red/50 hover:text-red-glow'
        }`}
      >
        Next <ChevronRight size={15} />
      </Link>
    </nav>
  );
}
