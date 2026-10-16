import Link from "next/link";
import Image from "next/image";
import { HiOutlineArrowRight } from "react-icons/hi";
import { ProductCard } from "@/components/storefront/ProductCard";
import { createClient } from "@/lib/supabase/server";
import { BUSINESS } from "@/lib/constants";
import { getCurrentBatch } from "@/lib/batches";
import { BatchBanner } from "@/components/storefront/BatchBanner";

export default async function HomePage() {
  const supabase = await createClient();
  const batch = await getCurrentBatch(supabase);

  const [{ data: categories }, { data: featuredProducts }] = await Promise.all([
    supabase.from("categories").select("name, slug, image_url").order("name"),
    supabase
      .from("products")
      .select("slug, name, price, product_images(image_url, sort_order), product_colors(image_url, sort_order)")
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(8),
  ]);

  return (
    <div>
      <div className="max-w-6xl mx-auto px-4 md:px-6 pt-6">
        <BatchBanner batch={batch} />

        <section>
          {/* The headline is baked into the banner image, so this keeps it
              readable for search engines and screen readers */}
          <h1 className="sr-only">
            Quality goods, sourced from China and beyond, delivered to Ghana.
          </h1>
          <p className="sr-only">
            Fashion, electronics, home items, and more — order what you need and we handle the
            sourcing and importation.
          </p>

          {/* Full banner on every screen size */}
          <div className="relative aspect-[2/1] overflow-hidden rounded-lg border border-navy-100 bg-canvas">
            <Image
              src="/hero-banner.jpg"
              alt={`${BUSINESS.name} banner`}
              fill
              priority
              sizes="(max-width: 1200px) 100vw, 1152px"
              className="object-cover"
            />

            {/* Tablet and desktop: button sits on the banner, beside the last line of text */}
            <Link
              href="/shop"
              className="hidden md:inline-flex absolute left-[20%] top-[91%] -translate-y-1/2 items-center gap-2 rounded bg-turquoise-dark px-3 py-1.5 text-xs font-medium text-white shadow-sm transition hover:bg-turquoise lg:px-5 lg:py-2 lg:text-sm"
            >
              Browse products
              <HiOutlineArrowRight className="h-3.5 w-3.5 lg:h-4 lg:w-4" />
            </Link>
          </div>

          {/* Mobile: button goes under the banner so it never covers the text */}
          <Link
            href="/shop"
            className="md:hidden mt-3 flex items-center justify-center gap-2 rounded bg-turquoise-dark py-3 text-sm font-medium text-white"
          >
            Browse products
            <HiOutlineArrowRight className="h-4 w-4" />
          </Link>
        </section>

        {/* Categories, right after the Browse products button */}
        {categories && categories.length > 0 && (
          <section className="mt-8">
            <h2 className="font-display text-lg text-navy-900 mb-4">Shop by category</h2>
            <div className="flex gap-4 overflow-x-auto pb-2 -mx-4 px-4 md:mx-0 md:px-0">
              {categories.map((cat) => (
                <Link
                  key={cat.slug}
                  href={`/shop?category=${cat.slug}`}
                  className="flex flex-col items-center gap-2 shrink-0 group"
                >
                  <div className="relative w-16 h-16 md:w-20 md:h-20 rounded-full overflow-hidden border-2 border-navy-100 group-hover:border-turquoise-dark transition">
                    {cat.image_url ? (
                      <Image src={cat.image_url} alt={cat.name} fill className="object-cover" sizes="80px" />
                    ) : (
                      <div className="w-full h-full bg-navy-50 flex items-center justify-center">
                        <span className="text-[10px] text-navy-400 px-1 text-center leading-tight">{cat.name}</span>
                      </div>
                    )}
                  </div>
                  <span className="text-xs text-navy-600 text-center max-w-[80px] leading-tight">
                    {cat.name}
                  </span>
                </Link>
              ))}
            </div>
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
