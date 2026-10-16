import type { SupabaseClient } from "@supabase/supabase-js";
import type { ProductInput } from "@/lib/validation/product";

/** Inserts colors, sizes and unavailable combinations for a product. Returns an error message or null. */
export async function saveVariants(
  supabase: SupabaseClient,
  productId: string,
  colors: ProductInput["colors"],
  sizes: ProductInput["sizes"],
  unavailable: ProductInput["unavailable"]
): Promise<string | null> {
  const colorIdMap = new Map<string, string>();
  const sizeIdMap = new Map<string, string>();

  if (colors.length > 0) {
    const { data, error } = await supabase
      .from("product_colors")
      .insert(
        colors.map((c, i) => ({
          product_id: productId,
          color_name: c.color_name,
          image_url: c.image_url,
          sort_order: i,
        }))
      )
      .select("id, sort_order");
    if (error) return error.message;

    (data ?? []).forEach((row: { id: string; sort_order: number }) => {
      const source = colors[row.sort_order];
      if (source) colorIdMap.set(source.client_id, row.id);
    });
  }

  if (sizes.length > 0) {
    const { data, error } = await supabase
      .from("product_sizes")
      .insert(
        sizes.map((s, i) => ({
          product_id: productId,
          size_value: s.size_value,
          price: s.price,
          sort_order: i,
        }))
      )
      .select("id, sort_order");
    if (error) return error.message;

    (data ?? []).forEach((row: { id: string; sort_order: number }) => {
      const source = sizes[row.sort_order];
      if (source) sizeIdMap.set(source.client_id, row.id);
    });
  }

  const comboRows = unavailable
    .map((u) => ({
      color_id: colorIdMap.get(u.color_client_id),
      size_id: sizeIdMap.get(u.size_client_id),
    }))
    .filter((r): r is { color_id: string; size_id: string } => Boolean(r.color_id && r.size_id));

  if (comboRows.length > 0) {
    const { error } = await supabase.from("product_unavailable_combos").insert(comboRows);
    if (error) return error.message;
  }

  return null;
}
