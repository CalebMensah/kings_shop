import { cache } from "react";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { ProductDetail } from "@/components/storefront/ProductDetail";
import { RecentlyViewedTracker } from "@/components/storefront/RecentlyViewedTracker";
import { getCurrentBatch } from "@/lib/batches";
import { BatchBanner } from "@/components/storefront/BatchBanner";
import { firstSpecImage } from "@/lib/specs";
import { BUSINESS } from "@/lib/constants";

const PRODUCT_SELECT =
  "*, product_images(image_url, sort_order), product_specs(id, name, sort_order, product_spec_options(id, name, image_url, sort_order)), product_variants(id, price, is_available, stock_quantity, product_variant_options(option_id))";

const fetchProduct = cache(async (slug: string) => {
  const supabase = await createClient();
  return supabase
    .from("products")
    .select(PRODUCT_SELECT)
    .eq("slug", slug)
    .eq("status", "active")
    .single();
});

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const { data: product } = await fetchProduct(slug);

  if (!product) return { title: "Product not found | " + BUSINESS.name };

  const firstImage =
    [...(product.product_images ?? [])].sort((a: any, b: any) => a.sort_order - b.sort_order)[0]?.image_url ??
    firstSpecImage(product.product_specs);
  const url = process.env.NEXT_PUBLIC_APP_URL + "/product/" + slug;
  const shortText = product.description ?? "GH₵" + product.price;
  const longText = product.description ?? "GH₵" + product.price + " — order on " + BUSINESS.name + ".";

  return {
    title: product.name + " | " + BUSINESS.name,
    description: longText,
    openGraph: {
      title: product.name,
      description: shortText,
      url,
      images: firstImage ? [{ url: firstImage, width: 1200, height: 1200, alt: product.name }] : [],
    },
    twitter: {
      card: "summary_large_image",
      title: product.name,
      description: shortText,
      images: firstImage ? [firstImage] : [],
    },
  };
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createClient();
  const batch = await getCurrentBatch(supabase);

  const { data: product, error } = await fetchProduct(slug);
  if (error || !product) notFound();

  return (
    <div>
      <RecentlyViewedTracker slug={product.slug} />
      <div className="max-w-6xl mx-auto px-4 md:px-6 pt-6">
        <BatchBanner batch={batch} />
      </div>
      <ProductDetail product={product} />
    </div>
  );
}
