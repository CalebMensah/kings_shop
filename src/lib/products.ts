import type { SupabaseClient } from "@supabase/supabase-js";
import type { SpecImageSource, VariantPriceSource } from "@/lib/specs";

export const PAGE_SIZE = 12;

const PRODUCT_FIELDS =
  "id, slug, name, price, track_stock, stock_quantity, product_images(image_url, sort_order), product_specs(sort_order, product_spec_options(image_url, sort_order)), product_variants(price, is_available, stock_quantity)";

export type Availability = "available" | "preorder";

export type ProductListItem = {
  id: string;
  slug: string;
  name: string;
  price: number;
  track_stock: boolean;
  stock_quantity: number;
  product_images: { image_url: string; sort_order: number }[];
  product_specs: SpecImageSource[];
  product_variants: VariantPriceSource[];
};

/** A short random token. The same seed always gives the same shuffled order, so infinite scroll never repeats or skips. */
export function newSeed() {
  return Math.random().toString(36).slice(2, 10).padEnd(8, "0");
}

export function cleanSeed(value: string | null | undefined) {
  return value && /^[a-z0-9]{1,32}$/i.test(value) ? value : undefined;
}

export function cleanAvailability(value: string | null | undefined): Availability | undefined {
  return value === "available" || value === "preorder" ? value : undefined;
}

export async function getProductsPage(
  supabase: SupabaseClient,
  opts: {
    page?: number;
    categorySlug?: string;
    search?: string;
    seed?: string;
    availability?: Availability;
    limit?: number;
  }
): Promise<{ products: ProductListItem[]; hasMore: boolean }> {
  const size = Math.min(Math.max(opts.limit ?? PAGE_SIZE, 1), 50);
  const page = Math.max(0, opts.page ?? 0);
  const search = opts.search?.trim().slice(0, 100) || undefined;
  const from = page * size;

  let categoryIds: string[] | null = null;
  if (opts.categorySlug) {
    const { data: category } = await supabase
      .from("categories")
      .select("id")
      .eq("slug", opts.categorySlug)
      .maybeSingle();
    if (!category) return { products: [], hasMore: false };

    // A main category includes everything inside its subcategories
    const { data: children } = await supabase.from("categories").select("id").eq("parent_id", category.id);
    categoryIds = [category.id, ...(children ?? []).map((c) => c.id)];
  }

  // One database call decides which products, in which order (shuffled, or newest first for searches)
  const { data: idRows, error: idError } = await supabase.rpc("product_ids_page", {
    p_seed: search ? null : opts.seed ?? null,
    p_search: search ?? null,
    p_category_ids: categoryIds,
    p_availability: opts.availability ?? null,
    p_offset: from,
    p_limit: size + 1, // one extra row tells us whether another page exists
  });

  if (!idError) {
    const ids = ((idRows ?? []) as { id: string }[]).map((row) => row.id);
    const pageIds = ids.slice(0, size);
    if (pageIds.length === 0) return { products: [], hasMore: false };

    const { data, error } = await supabase.from("products").select(PRODUCT_FIELDS).in("id", pageIds);
    if (error) {
      console.error("PRODUCTS FETCH ERROR:", error.message);
      return { products: [], hasMore: false };
    }

    const byId = new Map(((data ?? []) as unknown as ProductListItem[]).map((p) => [p.id, p]));
    const products = pageIds
      .map((id) => byId.get(id))
      .filter((p): p is ProductListItem => Boolean(p));
    return { products, hasMore: ids.length > size };
  }

  console.error("PRODUCT IDS RPC ERROR (is the product_ids_page SQL function created?):", idError.message);

  // Fallback so the shop never goes empty: newest first, availability filter not applied
  let query = supabase
    .from("products")
    .select(PRODUCT_FIELDS)
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .order("id", { ascending: false });

  if (categoryIds) query = query.in("category_id", categoryIds);
  if (search) query = query.ilike("name", `%${search}%`);

  const { data, error } = await query.range(from, from + size);
  if (error) {
    console.error("PRODUCTS PAGE ERROR:", error.message);
    return { products: [], hasMore: false };
  }

  const rows = (data ?? []) as unknown as ProductListItem[];
  return { products: rows.slice(0, size), hasMore: rows.length > size };
}
