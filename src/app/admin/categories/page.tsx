import { PageHeader } from "@/components/admin/PageHeader";
import { CategoryManager } from "@/components/admin/CategoryManager";
import { createClient } from "@/lib/supabase/server";

export default async function CategoriesPage() {
  const supabase = await createClient();
  const { data: categories } = await supabase
    .from("categories")
    .select("*, products(count)")
    .order("sort_order")
    .order("name");

  return (
    <div>
      <PageHeader
        title="Categories"
        description="Main categories and their subcategories — each can have its own image"
      />
      <CategoryManager categories={categories ?? []} />
    </div>
  );
}
