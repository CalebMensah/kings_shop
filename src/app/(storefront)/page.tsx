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

  const { data: featuredProducts } = await supabase
    .from("products")
    .select("slug, name, price, product_images(image_url, sort_order), product_colors(image_url, sort_order)")
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(8);

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

          {/* Mobile: crops to the left 62% of the banner (where all the text is) so it stays readable.
              md and up: shows the full 2:1 banner. */}
          <div className="relative aspect-[5/4] md:aspect-[2/1] overflow-hidden rounded-lg border border-navy-100 bg-canvas">
            <Image
              src="/hero-banner.jpg"
              alt={`${BUSINESS.name} banner`}
              fill
              priority
              sizes="(max-width: 767px) 160vw, (max-width: 1200px) 100vw, 1152px"
              className="object-cover object-left md:object-center"
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
