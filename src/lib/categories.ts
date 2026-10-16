import type { SupabaseClient } from "@supabase/supabase-js";

export type CategoryRow = {
  id: string;
  name: string;
  slug: string;
  image_url: string | null;
  parent_id: string | null;
  sort_order: number;
};

const FIELDS = "id, name, slug, image_url, parent_id, sort_order";

export async function getMainCategories(supabase: SupabaseClient): Promise<CategoryRow[]> {
  const { data } = await supabase
    .from("categories")
    .select(FIELDS)
    .is("parent_id", null)
    .order("sort_order")
    .order("name");
  return (data ?? []) as CategoryRow[];
}

export async function getCategoryContext(supabase: SupabaseClient, slug: string) {
  const { data: current } = await supabase
    .from("categories")
    .select(FIELDS)
    .eq("slug", slug)
    .maybeSingle();
  if (!current) return null;

  const category = current as CategoryRow;
  let parent: CategoryRow | null = null;
  let siblings: CategoryRow[] = [];
  let children: CategoryRow[] = [];

  if (category.parent_id) {
    const [{ data: p }, { data: s }] = await Promise.all([
      supabase.from("categories").select(FIELDS).eq("id", category.parent_id).maybeSingle(),
      supabase
        .from("categories")
        .select(FIELDS)
        .eq("parent_id", category.parent_id)
        .order("sort_order")
        .order("name"),
    ]);
    parent = (p as CategoryRow | null) ?? null;
    siblings = (s ?? []) as CategoryRow[];
  } else {
    const { data: c } = await supabase
      .from("categories")
      .select(FIELDS)
      .eq("parent_id", category.id)
      .order("sort_order")
      .order("name");
    children = (c ?? []) as CategoryRow[];
  }

  return { category, parent, siblings, children };
}

/** Categories a product can be assigned to: subcategories, plus mains that have no subcategories. */
export async function getLeafCategoryOptions(supabase: SupabaseClient) {
  const { data } = await supabase.from("categories").select("id, name, parent_id, sort_order");
  const all = (data ?? []) as { id: string; name: string; parent_id: string | null; sort_order: number }[];

  const parentIds = new Set(all.map((c) => c.parent_id).filter(Boolean));
  const byId = new Map(all.map((c) => [c.id, c]));

  const rank = (c: (typeof all)[number]): [number, number] => {
    const parent = c.parent_id ? byId.get(c.parent_id) : undefined;
    return parent ? [parent.sort_order, c.sort_order] : [c.sort_order, 0];
  };

  return all
    .filter((c) => !parentIds.has(c.id))
    .sort((a, b) => {
      const [a1, a2] = rank(a);
      const [b1, b2] = rank(b);
      return a1 - b1 || a2 - b2 || a.name.localeCompare(b.name);
    })
    .map((c) => {
      const parent = c.parent_id ? byId.get(c.parent_id) : undefined;
      return { id: c.id, name: parent ? `${parent.name} › ${c.name}` : c.name };
    });
}
