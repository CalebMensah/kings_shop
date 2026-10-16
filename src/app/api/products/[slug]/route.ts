import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("products")
    .select(`*,
      category:categories(name, slug),
      product_images(image_url, sort_order),
      product_colors(id, color_name, image_url, sort_order, product_unavailable_combos(size_id)),
      product_sizes(id, size_value, price, sort_order)`)
    .eq("slug", slug)
    .eq("status", "active")
    .single();

  if (error || !data) return NextResponse.json({ error: "Product not found" }, { status: 404 });
  return NextResponse.json({ product: data });
}
