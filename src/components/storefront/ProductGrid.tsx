"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ProductCard } from "@/components/storefront/ProductCard";
import type { ProductListItem } from "@/lib/products";

export function ProductGrid({
  initialProducts,
  initialHasMore,
  categorySlug,
  search,
  seed,
  emptyMessage = "No products found.",
}: {
  initialProducts: ProductListItem[];
  initialHasMore: boolean;
  categorySlug?: string;
  search?: string;
  seed?: string;
  emptyMessage?: string;
}) {
  const [products, setProducts] = useState<ProductListItem[]>(initialProducts);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const busy = useRef(false);
  const sentinel = useRef<HTMLDivElement | null>(null);

  const loadMore = useCallback(async () => {
    if (busy.current || !hasMore) return;
    busy.current = true;
    setLoading(true);
    setError(false);

    try {
      const params = new URLSearchParams({ page: String(page) });
      if (categorySlug) params.set("category", categorySlug);
      if (search) params.set("search", search);
      if (seed) params.set("seed", seed);

      const res = await fetch(`/api/products?${params.toString()}`);
      if (!res.ok) throw new Error("Request failed");
      const data: { products: ProductListItem[]; hasMore: boolean } = await res.json();

      setProducts((prev) => {
        const seen = new Set(prev.map((p) => p.slug));
        return [...prev, ...data.products.filter((p) => !seen.has(p.slug))];
      });
      setHasMore(data.hasMore);
      setPage((p) => p + 1);
    } catch {
      setError(true);
    } finally {
      busy.current = false;
      setLoading(false);
    }
  }, [page, hasMore, categorySlug, search, seed]);

  useEffect(() => {
    const el = sentinel.current;
    if (!el || !hasMore || error) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) loadMore();
      },
      { rootMargin: "600px 0px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [loadMore, hasMore, error]);

  if (products.length === 0) {
    return <p className="text-navy-400 text-sm py-12 text-center">{emptyMessage}</p>;
  }

  return (
    <div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
        {products.map((product) => (
          <ProductCard key={product.slug} product={product} />
        ))}

        {loading &&
          Array.from({ length: 4 }).map((_, i) => (
            <div key={`skeleton-${i}`} className="animate-pulse">
              <div className="aspect-square bg-navy-50 rounded" />
              <div className="h-3 bg-navy-50 rounded mt-2 w-3/4" />
              <div className="h-3 bg-navy-50 rounded mt-1.5 w-1/3" />
            </div>
          ))}
      </div>

      {hasMore && !error && <div ref={sentinel} className="h-10" />}

      {error && (
        <div className="text-center py-8">
          <p className="text-sm text-navy-500 mb-3">Couldn&apos;t load more products.</p>
          <button
            onClick={loadMore}
            className="border border-navy-200 text-navy-700 text-sm px-4 py-2 rounded hover:bg-navy-50 transition"
          >
            Try again
          </button>
        </div>
      )}

      {!hasMore && page > 1 && (
        <p className="text-center text-xs text-navy-400 py-8">You&apos;ve seen everything in here.</p>
      )}
    </div>
  );
}
