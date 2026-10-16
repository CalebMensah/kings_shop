import { cache } from "react";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { HiOutlineChevronRight } from "react-icons/hi";
import { createClient } from "@/lib/supabase/server";
import { getCategoryContext } from "@/lib/categories";
import { getProductsPage } from "@/lib/products";
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
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const ctx = await loadContext(slug);
  if (!ctx) notFound();

  const { category, parent, siblings, children } = ctx;
  const supabase = await createClient();
  const { products, hasMore } = await getProductsPage(supabase, { page: 0, categorySlug: slug });

  const hasChildren = children.length > 0;

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

      {/* Main category: subcategory grid */}
      {hasChildren && (
        <section className="mb-10">
          <h2 className="text-sm font-medium text-navy-700 mb-4">Browse {category.name}</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
            {children.map((sub) => (
              <Link key={sub.id} href={`/category/${sub.slug}`} className="group block">
                <div className="relative aspect-square overflow-hidden rounded border border-navy-100 bg-navy-50">
                  {sub.image_url ? (
                    <Image
                      src={sub.image_url}
                      alt={sub.name}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-300"
                      sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center p-3 text-center text-sm text-navy-400">
                      {sub.name}
                    </div>
                  )}
                </div>
                <p className="mt-2 text-sm text-navy-900 group-hover:text-turquoise-dark transition">{sub.name}</p>
              </Link>
            ))}
          </div>
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
        <h2 className="text-sm font-medium text-navy-700 mb-4">All {category.name}</h2>
      )}

      <ProductGrid
        key={slug}
        initialProducts={products}
        initialHasMore={hasMore}
        categorySlug={slug}
        emptyMessage={`No products in ${category.name} yet.`}
      />
    </div>
  );
}
