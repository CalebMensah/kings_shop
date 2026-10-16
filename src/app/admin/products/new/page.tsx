import { PageHeader } from "@/components/admin/PageHeader";
import { ProductForm } from "@/components/admin/ProductForm";
import { createClient } from "@/lib/supabase/server";
import { getLeafCategoryOptions } from "@/lib/categories";

export default async function NewProductPage() {
  const supabase = await createClient();
  const categories = await getLeafCategoryOptions(supabase);

  return (
    <div>
      <PageHeader title="Add product" description="Create a new product listing" />
      <ProductForm categories={categories} />
    </div>
  );
}
