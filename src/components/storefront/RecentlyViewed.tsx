"use client";

import { useEffect, useState } from "react";
import { ProductCard } from "@/components/storefront/ProductCard";
import { clearRecentlyViewed, getRecentlyViewed } from "@/lib/recently-viewed";
import type { ProductListItem } from "@/lib/products";

export function RecentlyViewed({
  excludeSlugs = [],
  limit = 8,
}: {
  excludeSlugs?: string[];
  limit?: number;
}) {
  const [products, setProducts] = useState<ProductListItem[]>([]);
  const excludeKey = excludeSlugs.join(",");

  useEffect(() => {
    const exclude = new Set(excludeKey ? excludeKey.split(",") : []);
    const slugs = getRecentlyViewed()
      .filter((slug) => !exclude.has(slug))
      .slice(0, limit);

    if (slugs.length === 0) {
      setProducts([]);
      return;
    }

    const controller = new AbortController();

    fetch(`/api/recently-viewed?slugs=${encodeURIComponent(slugs.join(","))}`, {
      signal: controller.signal,
    })
      .then((res) => (res.ok ? res.json() : { products: [] }))
      .then((data: { products?: ProductListItem[] }) => setProducts(data.products ?? []))
      .catch(() => {
        // Offline or cancelled: the row just stays hidden
      });

    return () => controller.abort();
  }, [excludeKey, limit]);

  // Nothing viewed yet (or nothing left to show): no heading, no empty space
  if (products.length === 0) return null;

  return (
    <section className="max-w-6xl mx-auto px-4 md:px-6 pb-12">
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-display text-2xl text-navy-900">Recently viewed</h2>
        <button
          type="button"
          onClick={() => {
            clearRecentlyViewed();
            setProducts([]);
          }}
          className="text-sm text-navy-400 hover:text-navy-700"
        >
          Clear
        </button>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
        {products.map((product) => (
          <ProductCard key={product.slug} product={product} />
        ))}
      </div>
    </section>
  );
      }
