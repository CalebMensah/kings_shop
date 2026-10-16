import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getMainCategories } from "@/lib/categories";
import { getProductsPage } from "@/lib/products";
import { getCurrentBatch } from "@/lib/batches";
import { BatchBanner } from "@/components/storefront/BatchBanner";
import { SearchBar } from "@/components/storefront/SearchBar";
import { CategoryRail } from "@/components/storefront/CategoryRail";
import { ProductGrid } from "@/components/storefront/ProductGrid";

export default async function ShopPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; search?: string }>;
}) {
  const { category, search } = await searchParams;

  // Old links like /shop?category=shoes now live on their own page
  if (category) redirect(`/category/${encodeURIComponent(category)}`);

  const supabase = await createClient();
  const batch = await getCurrentBatch(supabase);

  const [mainCategories, { products, hasMore }] = await Promise.all([
    getMainCategories(supabase),
    getProductsPage(supabase, { page: 0, search }),
  ]);

  return (
    <div className="max-w-6xl mx-auto px-4 md:px-6 py-10">
      <h1 className="font-display text-3xl text-navy-900 mb-6">Shop</h1>

      <BatchBanner batch={batch} />

      <div className="mb-6 max-w-sm">
        <SearchBar initialValue={search ?? ""} />
      </div>

      <div className="mb-8">
        <CategoryRail categories={mainCategories} showAll />
      </div>

      {search && (
        <p className="text-sm text-navy-400 mb-4">Results for &ldquo;{search}&rdquo;</p>
      )}

      <ProductGrid
        key={search ?? ""}
        initialProducts={products}
        initialHasMore={hasMore}
        search={search}
        emptyMessage={search ? `No products match "${search}".` : "No products yet."}
      />
    </div>
  );
}
