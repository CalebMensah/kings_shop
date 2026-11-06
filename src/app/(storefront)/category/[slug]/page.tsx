import { cache } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { HiOutlineChevronRight } from "react-icons/hi";
import { createClient } from "@/lib/supabase/server";
import { getCategoryContext } from "@/lib/categories";
import { cleanAvailability, getProductsPage } from "@/lib/products";
import { CategoryRail } from "@/components/storefront/CategoryRail";
import { AvailabilityFilter } from "@/components/storefront/AvailabilityFilter";
import { ProductGrid } from "@/components/storefront/ProductGrid";
import { BUSINESS } from "@/lib/constants";

const loadContext = cache(async (slug: string) => {
  const supabase = await createClient();
  return getCategoryContext(supabase, slug);
});

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const ctx = await loadContext(slug);
  if (!ctx) return { title: `Category not found | ${BUSINESS.name}` };

  const { category, parent } = ctx;
  const title = parent ? `${category.name} — ${parent.name}` : category.name;

  return {
    title: `${title} | ${BUSINESS.name}`,
    description: `Browse ${category.name} at ${BUSINESS.name}.`,
    openGraph: {
      title,
      images: category.image_url ? [{ url: category.image_url }] : [],
    },
  };
}

export default async function CategoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ availability?: string }>;
}) {
  const { slug } = await params;
  const { availability: rawAvailability } = await searchParams;
  const availability = cleanAvailability(rawAvailability);

  const ctx = await loadContext(slug);
  if (!ctx) notFound();

  const { category, parent, siblings, children } = ctx;
  const supabase = await createClient();
  const { products, hasMore } = await getProductsPage(supabase, {
    page: 0,
    categorySlug: slug,
    availability,
  });

  const hasChildren = children.length > 0;

  let emptyMessage = `No products in ${category.name} yet.`;
  if (availability === "available") emptyMessage = `Nothing in ${category.name} is in stock right now. Try the Preorder filter.`;
  else if (availability === "preorder") emptyMessage = `No preorder products in ${category.name} yet.`;

  return (
    <div className="max-w-6xl mx-auto px-4 md:px-6 py-8 md:py-10">
      {/* Breadcrumbs */}
      <nav className="flex flex-wrap items-center gap-1 text-xs text-navy-400 mb-4">
        <Link href="/shop" className="hover:text-navy-900">Shop</Link>
        {parent && (
          <>
            <HiOutlineChevronRight className="w-3 h-3" />
            <Link href={`/category/${parent.slug}`} className="hover:text-navy-900">{parent.name}</Link>
          </>
        )}
        <HiOutlineChevronRight className="w-3 h-3" />
        <span className="text-navy-700">{category.name}</span>
      </nav>

      <h1 className="font-display text-2xl md:text-3xl text-navy-900 mb-6">{category.name}</h1>

      {/* Main category: round subcategories, same style as the shop page */}
      {hasChildren && (
        <section className="mb-8">
          <h2 className="text-sm font-medium text-navy-700 mb-3">Browse {category.name}</h2>
          <CategoryRail categories={children} />
        </section>
      )}

      {/* Subcategory: quick switch between siblings */}
      {parent && siblings.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-2 mb-6 -mx-4 px-4 md:mx-0 md:px-0">
          <Link
            href={`/category/${parent.slug}`}
            className="shrink-0 text-sm px-3 py-1.5 rounded-full border border-navy-100 text-navy-500 hover:bg-navy-50"
          >
            All {parent.name}
          </Link>
          {siblings.map((sib) => (
            <Link
              key={sib.id}
              href={`/category/${sib.slug}`}
              className={`shrink-0 text-sm px-3 py-1.5 rounded-full border ${
                sib.slug === category.slug
                  ? "bg-navy-800 text-white border-navy-800"
                  : "border-navy-100 text-navy-500 hover:bg-navy-50"
              }`}
            >
              {sib.name}
            </Link>
          ))}
        </div>
      )}

      {hasChildren && (
        <h2 className="text-sm font-medium text-navy-700 mb-3">All {category.name}</h2>
      )}

      <div className="mb-6">
        <AvailabilityFilter basePath={`/category/${slug}`} current={availability} />
      </div>

      <ProductGrid
        key={`${slug}-${availability ?? "all"}`}
        initialProducts={products}
        initialHasMore={hasMore}
        categorySlug={slug}
        availability={availability}
        emptyMessage={emptyMessage}
      />
    </div>
  );
}
