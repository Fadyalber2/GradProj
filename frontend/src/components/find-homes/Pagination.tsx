"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange?: (page: number) => void;
}

export default function Pagination({
  currentPage,
  totalPages,
  onPageChange,
}: PaginationProps) {
  const pages: (number | "ellipsis")[] = [];

  // Build page numbers: 1, 2, 3 ... last
  for (let i = 1; i <= Math.min(3, totalPages); i++) {
    pages.push(i);
  }
  if (totalPages > 4) {
    pages.push("ellipsis");
  }
  if (totalPages > 3) {
    pages.push(totalPages);
  }

  return (
    <div className="mt-12 flex justify-center items-center gap-2 pb-12">
      <button
        onClick={() => onPageChange?.(Math.max(1, currentPage - 1))}
        disabled={currentPage === 1}
        className="w-10 h-10 rounded-lg bg-card-dark border border-white/5 text-gray-400 hover:text-white transition-colors flex items-center justify-center disabled:opacity-50"
      >
        <ChevronLeft className="h-5 w-5" />
      </button>

      {pages.map((page, i) =>
        page === "ellipsis" ? (
          <span key={`e-${i}`} className="text-gray-600 px-2">
            ...
          </span>
        ) : (
          <button
            key={page}
            onClick={() => onPageChange?.(page)}
            className={`w-10 h-10 rounded-lg text-sm font-medium transition-colors ${
              page === currentPage
                ? "bg-primary text-white font-bold"
                : "bg-card-dark border border-white/5 text-gray-400 hover:text-white"
            }`}
          >
            {page}
          </button>
        )
      )}

      <button
        onClick={() => onPageChange?.(Math.min(totalPages, currentPage + 1))}
        disabled={currentPage === totalPages}
        className="w-10 h-10 rounded-lg bg-card-dark border border-white/5 text-gray-400 hover:text-white transition-colors flex items-center justify-center disabled:opacity-50"
      >
        <ChevronRight className="h-5 w-5" />
      </button>
    </div>
  );
}
