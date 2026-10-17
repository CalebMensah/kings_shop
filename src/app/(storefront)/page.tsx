import Link from "next/link";
import Image from "next/image";
import { HiOutlineArrowRight } from "react-icons/hi";
import { ProductCard } from "@/components/storefront/ProductCard";
import { CategoryRail } from "@/components/storefront/CategoryRail";
import { createClient } from "@/lib/supabase/server";
import { getMainCategories } from "@/lib/categories";
import { BUSINESS } from "@/lib/constants";
import { getCurrentBatch } from "@/lib/batches";
import { BatchBanner } from "@/components/storefront/BatchBanner";

export default async function HomePage() {
  const supabase = await createClient();
  const batch = await getCurrentBatch(supabase);

  const [categories, { data: featuredProducts }] = await Promise.all([
    getMainCategories(supabase),
    supabase
      .from("products")
      .select("slug, name, price, product_images(image_url, sort_order), product_specs(sort_order, product_spec_options(image_url, sort_order)), product_variants(price, is_available)")
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(8),
  ]);

  return (
    <div>
      <div className="max-w-6xl mx-auto px-4 md:px-6 pt-6">
        <BatchBanner batch={batch} />

        <section>
          <h1 className="sr-only">
            Quality goods, sourced from China and beyond, delivered to Ghana.
          </h1>
          <p className="sr-only">
            Fashion, electronics, home items, and more — order what you need and we handle the
            sourcing and importation.
          </p>

          <div className="relative aspect-[2/1] overflow-hidden rounded-lg border border-navy-100 bg-canvas">
            <Image
              src="/hero-banner.jpg"
              alt={`${BUSINESS.name} banner`}
              fill
              priority
              sizes="(max-width: 1200px) 100vw, 1152px"
              className="object-cover"
            />

            <Link
              href="/shop"
              className="hidden md:inline-flex absolute left-[20%] top-[91%] -translate-y-1/2 items-center gap-2 rounded bg-turquoise-dark px-3 py-1.5 text-xs font-medium text-white shadow-sm transition hover:bg-turquoise lg:px-5 lg:py-2 lg:text-sm"
            >
              Browse products
              <HiOutlineArrowRight className="h-3.5 w-3.5 lg:h-4 lg:w-4" />
            </Link>
          </div>

          <Link
            href="/shop"
            className="md:hidden mt-3 flex items-center justify-center gap-2 rounded bg-turquoise-dark py-3 text-sm font-medium text-white"
          >
            Browse products
            <HiOutlineArrowRight className="h-4 w-4" />
          </Link>
        </section>

        {categories.length > 0 && (
          <section className="mt-8">
            <h2 className="font-display text-lg text-navy-900 mb-4">Shop by category</h2>
            <CategoryRail categories={categories} />
          </section>
        )}
      </div>

      <section className="max-w-6xl mx-auto px-4 md:px-6 py-12">
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-display text-2xl text-navy-900">Latest arrivals</h2>
          <Link href="/shop" className="text-sm text-ocean hover:underline">View all</Link>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
          {featuredProducts?.map((product) => (
            <ProductCard key={product.slug} product={product as any} />
          ))}
        </div>
      </section>
    </div>
  );
}
