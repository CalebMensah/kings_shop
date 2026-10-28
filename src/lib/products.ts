import type { SupabaseClient } from "@supabase/supabase-js";
import type { SpecImageSource, VariantPriceSource } from "@/lib/specs";

export const PAGE_SIZE = 12;

const PRODUCT_FIELDS =
  "id, slug, name, price, product_images(image_url, sort_order), product_specs(sort_order, product_spec_options(image_url, sort_order)), product_variants(price, is_available)";

export type ProductListItem = {
  id: string;
  slug: string;
  name: string;
  price: number;
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

export async function getProductsPage(
  supabase: SupabaseClient,
  opts: { page?: number; categorySlug?: string; search?: string; seed?: string; limit?: number }
): Promise<{ products: ProductListItem[]; hasMore: boolean }> {
  const size = Math.min(Math.max(opts.limit ?? PAGE_SIZE, 1), 50);
  const page = Math.max(0, opts.page ?? 0);
  const search = opts.search?.trim().slice(0, 100);
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

  // Random order: a seeded shuffle, so every visit differs but paging stays consistent
  if (opts.seed && !search) {
    const { data: idRows, error: idError } = await supabase.rpc("random_product_ids", {
      p_seed: opts.seed,
      p_offset: from,
      p_limit: size + 1,
      p_category_ids: categoryIds,
    });

    if (!idError) {
      const ids = ((idRows ?? []) as { id: string }[]).map((row) => row.id);
      const pageIds = ids.slice(0, size);
      if (pageIds.length === 0) return { products: [], hasMore: false };

      const { data, error } = await supabase.from("products").select(PRODUCT_FIELDS).in("id", pageIds);
      if (!error) {
        const byId = new Map(((data ?? []) as unknown as ProductListItem[]).map((p) => [p.id, p]));
        const products = pageIds
          .map((id) => byId.get(id))
          .filter((p): p is ProductListItem => Boolean(p));
        return { products, hasMore: ids.length > size };
      }
      console.error("RANDOM PRODUCTS FETCH ERROR:", error.message);
    } else {
      console.error("RANDOM PRODUCTS RPC ERROR (is the SQL function created?):", idError.message);
    }
    // If anything above failed, fall through to newest-first rather than showing an empty shop
  }

  let query = supabase
    .from("products")
    .select(PRODUCT_FIELDS)
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .order("id", { ascending: false });

  if (categoryIds) query = query.in("category_id", categoryIds);
  if (search) query = query.ilike("name", `%${search}%`);

  // Fetch one extra row to know whether another page exists
  const { data, error } = await query.range(from, from + size);

  if (error) {
    console.error("PRODUCTS PAGE ERROR:", error.message);
    return { products: [], hasMore: false };
  }

  const rows = (data ?? []) as unknown as ProductListItem[];
  return { products: rows.slice(0, size), hasMore: rows.length > size };
}
