import { notFound } from "next/navigation";
import { PageHeader } from "@/components/admin/PageHeader";
import { ProductForm } from "@/components/admin/ProductForm";
import { ShareButton } from "@/components/storefront/ShareButton";
import { createClient } from "@/lib/supabase/server";
import { getLeafCategoryOptions } from "@/lib/categories";

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [categories, { data: raw }] = await Promise.all([
    getLeafCategoryOptions(supabase),
    supabase
      .from("products")
      .select(`*,
        product_images(image_url),
        product_colors(id, color_name, image_url, sort_order, product_unavailable_combos(size_id)),
        product_sizes(id, size_value, price, sort_order)`)
      .eq("id", id)
      .single(),
  ]);

  if (!raw) notFound();

  const product = {
    ...raw,
    unavailable_combos: (raw.product_colors ?? []).flatMap((c: any) =>
      (c.product_unavailable_combos ?? []).map((u: any) => ({ color_id: c.id, size_id: u.size_id }))
    ),
  };

  const productUrl = `${process.env.NEXT_PUBLIC_APP_URL}/product/${product.slug}`;

  return (
    <div>
      <PageHeader
        title="Edit product"
        description={product.name}
        action={<ShareButton productName={product.name} productUrl={productUrl} />}
      />
      <ProductForm categories={categories} existingProduct={product} />
    </div>
  );
}
