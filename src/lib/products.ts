import type { SupabaseClient } from "@supabase/supabase-js";

export const PAGE_SIZE = 12;

export type ProductListItem = {
  slug: string;
  name: string;
  price: number;
  product_images: { image_url: string; sort_order: number }[];
  product_colors: { image_url: string; sort_order: number }[];
};

export async function getProductsPage(
  supabase: SupabaseClient,
  opts: { page?: number; categorySlug?: string; search?: string }
): Promise<{ products: ProductListItem[]; hasMore: boolean }> {
  const page = Math.max(0, opts.page ?? 0);
  const search = opts.search?.trim().slice(0, 100);

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

  let query = supabase
    .from("products")
    .select("slug, name, price, product_images(image_url, sort_order), product_colors(image_url, sort_order)")
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .order("id", { ascending: false });

  if (categoryIds) query = query.in("category_id", categoryIds);
  if (search) query = query.ilike("name", `%${search}%`);

  // Fetch one extra row to know whether another page exists
  const from = page * PAGE_SIZE;
  const { data, error } = await query.range(from, from + PAGE_SIZE);

  if (error) {
    console.error("PRODUCTS PAGE ERROR:", error.message);
    return { products: [], hasMore: false };
  }

  const rows = (data ?? []) as unknown as ProductListItem[];
  return { products: rows.slice(0, PAGE_SIZE), hasMore: rows.length > PAGE_SIZE };
}
