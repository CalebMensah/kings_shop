export type SpecImageSource = {
  sort_order: number;
  product_spec_options?: { image_url: string | null; sort_order: number }[] | null;
};

export type VariantPriceSource = {
  price: number | null;
  is_available: boolean;
  stock_quantity?: number | null;
};

/** First option photo, used as a thumbnail when a product has no plain product images */
export function firstSpecImage(specs?: SpecImageSource[] | null): string | null {
  const sortedSpecs = [...(specs ?? [])].sort((a, b) => a.sort_order - b.sort_order);
  for (const spec of sortedSpecs) {
    const options = [...(spec.product_spec_options ?? [])].sort((a, b) => a.sort_order - b.sort_order);
    const hit = options.find((o) => o.image_url);
    if (hit?.image_url) return hit.image_url;
  }
  return null;
}

/** Cheapest and dearest available combination (falls back to the base price) */
export function priceRange(basePrice: number, variants?: VariantPriceSource[] | null) {
  const prices = (variants ?? []).filter((v) => v.is_available).map((v) => v.price ?? basePrice);
  if (prices.length === 0) return { min: basePrice, max: basePrice, hasRange: false };
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  return { min, max, hasRange: min !== max };
}

/** True when the product tracks stock and at least one combination is in stock right now */
export function hasStock(product: {
  track_stock?: boolean | null;
  stock_quantity?: number | null;
  product_variants?: VariantPriceSource[] | null;
}) {
  if (!product.track_stock) return false;
  const variants = product.product_variants ?? [];
  if (variants.length > 0) return variants.some((v) => v.is_available && (v.stock_quantity ?? 0) > 0);
  return (product.stock_quantity ?? 0) > 0;
}
