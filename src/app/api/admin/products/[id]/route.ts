import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { productSchema, firstIssueMessage } from "@/lib/validation/product";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: product, error } = await supabase
    .from("products")
    .select(`*,
      product_images(id, image_url, sort_order),
      product_specs(id, name, sort_order, product_spec_options(id, name, image_url, sort_order)),
      product_variants(id, price, is_available, product_variant_options(option_id))`)
    .eq("id", id)
    .single();

  if (error || !product) return NextResponse.json({ error: error?.message ?? "Not found" }, { status: 404 });
  return NextResponse.json({ product });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const parsed = productSchema.safeParse(body);
  if (!parsed.success) {
    console.error("PRODUCT UPDATE — validation failed:", JSON.stringify(parsed.error.flatten()));
    return NextResponse.json({ error: firstIssueMessage(parsed.error) }, { status: 400 });
  }

  const { specs, variants, ...productData } = parsed.data;
  const images: string[] = Array.isArray(body.images)
    ? body.images.filter((u: unknown): u is string => typeof u === "string" && u.startsWith("https://"))
    : [];

  const hasOptionPhoto = specs.some((s) => s.options.some((o) => o.image_url));
  if (images.length === 0 && !hasOptionPhoto) {
    return NextResponse.json(
      { error: "Add at least one product image, or a photo on one of the options" },
      { status: 400 }
    );
  }

  const { data: product, error } = await supabase
    .from("products")
    .update({ ...productData, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await supabase.from("product_images").delete().eq("product_id", id);
  if (images.length > 0) {
    await supabase.from("product_images").insert(
      images.map((url, i) => ({ product_id: id, image_url: url, sort_order: i }))
    );
  }

  // Replaces specs, options and combinations in one all-or-nothing step
  const { error: variantError } = await supabase.rpc("save_product_variants", {
    p_product_id: id,
    p_specs: specs,
    p_variants: variants,
  });

  if (variantError) {
    console.error("PRODUCT UPDATE — variants failed:", variantError.message);
    return NextResponse.json({ error: variantError.message }, { status: 500 });
  }

  return NextResponse.json({ product });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { error } = await supabase.from("products").update({ status: "archived" }).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
