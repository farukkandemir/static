"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";

// Read/write a subset of query params on the current route, replacing (not
// pushing) so filter tweaks don't pile up in history.
export function useUrlParams() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const setParams = useCallback(
    (updates: Record<string, string | number | null>) => {
      const params = new URLSearchParams(searchParams);
      for (const [key, value] of Object.entries(updates)) {
        if (value === null || value === "" || value === 0) params.delete(key);
        else params.set(key, String(value));
      }
      router.replace(`${pathname}${params.size ? `?${params}` : ""}`, { scroll: false });
    },
    [router, pathname, searchParams],
  );

  return { searchParams, setParams };
}

export function usePageParam() {
  const { searchParams, setParams } = useUrlParams();
  const raw = Number(searchParams.get("page"));
  const page = Number.isFinite(raw) && raw > 1 ? Math.floor(raw) : 1;
  const setPage = useCallback((p: number) => setParams({ page: p <= 1 ? null : p }), [setParams]);
  return [page, setPage] as const;
}
