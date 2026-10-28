import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { ProductListItem } from "@/lib/products";

const MAX_SLUGS = 12;
const SLUG = /^[a-z0-9-]{1,200}$/;

const PRODUCT_FIELDS =
  "id, slug, name, price, product_images(image_url, sort_order), product_specs(sort_order, product_spec_options(image_url, sort_order)), product_variants(price, is_available)";

export async function GET(request: NextRequest) {
  const raw = new URL(request.url).searchParams.get("slugs") ?? "";

  const slugs = Array.from(
    new Set(
      raw
        .split(",")
        .map((s) => s.trim())
        .filter((s) => SLUG.test(s))
    )
  ).slice(0, MAX_SLUGS);

  if (slugs.length === 0) return NextResponse.json({ products: [] });

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("products")
    .select(PRODUCT_FIELDS)
    .eq("status", "active")
    .in("slug", slugs);

  if (error) {
    console.error("RECENTLY VIEWED ERROR:", error.message);
    return NextResponse.json({ products: [] }, { status: 500 });
  }

  // Keep the visitor's order (most recent first). Archived or deleted products simply don't come back.
  const bySlug = new Map(((data ?? []) as unknown as ProductListItem[]).map((p) => [p.slug, p]));
  const products = slugs.map((slug) => bySlug.get(slug)).filter((p): p is ProductListItem => Boolean(p));

  return NextResponse.json({ products });
}
