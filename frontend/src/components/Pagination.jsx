import { ChevronLeft, ChevronRight } from 'lucide-react';

export default function Pagination({ page, totalPages, total, pageSize, onPage }) {
    if (totalPages <= 1) return null;

    const from = (page - 1) * pageSize + 1;
    const to   = Math.min(page * pageSize, total);

    // Generar páginas visibles (máx 5)
    const pages = [];
    const delta = 2;
    const left  = Math.max(1, page - delta);
    const right = Math.min(totalPages, page + delta);

    if (left > 1)          { pages.push(1); if (left > 2) pages.push('…'); }
    for (let i = left; i <= right; i++) pages.push(i);
    if (right < totalPages) { if (right < totalPages - 1) pages.push('…'); pages.push(totalPages); }

    return (
        <div className="pagination">
            <span className="pagination-info">
                {from}–{to} de {total} resultados
            </span>
            <div className="pagination-controls">
                <button className="pagination-btn" disabled={page === 1} onClick={() => onPage(page - 1)}>
                    <ChevronLeft size={14} />
                </button>
                {pages.map((p, i) =>
                    p === '…' ? (
                        <span key={`ellipsis-${i}`} style={{ width: 32, textAlign: 'center', color: 'var(--text-disabled)', fontSize: 13 }}>…</span>
                    ) : (
                        <button key={p} className={`pagination-btn${p === page ? ' active' : ''}`} onClick={() => onPage(p)}>
                            {p}
                        </button>
                    )
                )}
                <button className="pagination-btn" disabled={page === totalPages} onClick={() => onPage(page + 1)}>
                    <ChevronRight size={14} />
                </button>
            </div>
        </div>
    );
}