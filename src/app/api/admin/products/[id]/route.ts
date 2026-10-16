}import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { productSchema } from "@/lib/validation/product";
import { saveVariants } from "@/lib/product-variants";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: raw, error } = await supabase
    .from("products")
    .select(`*,
      product_images(id, image_url, sort_order),
      product_colors(id, color_name, image_url, sort_order, product_unavailable_combos(size_id)),
      product_sizes(id, size_value, price, sort_order)`)
    .eq("id", id)
    .single();

  if (error || !raw) return NextResponse.json({ error: error?.message ?? "Not found" }, { status: 404 });

  const product = {
    ...raw,
    unavailable_combos: (raw.product_colors ?? []).flatMap((c: any) =>
      (c.product_unavailable_combos ?? []).map((u: any) => ({ color_id: c.id, size_id: u.size_id }))
    ),
  };

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
  const parsed = productSchema.partial().safeParse(body);
  if (!parsed.success) {
    console.error("PRODUCT UPDATE — validation failed:", JSON.stringify(parsed.error.flatten()));
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { colors, sizes, unavailable, ...productData } = parsed.data;

  const { data: product, error } = await supabase
    .from("products")
    .update({ ...productData, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (body.images) {
    await supabase.from("product_images").delete().eq("product_id", id);
    const imageRows = (body.images as string[]).map((url: string, i: number) => ({
      product_id: id,
      image_url: url,
      sort_order: i,
    }));
    if (imageRows.length > 0) await supabase.from("product_images").insert(imageRows);
  }

  if (colors !== undefined) {
    // Replace colors, sizes and combinations as one set (combinations are removed automatically with them)
    const { error: delColors } = await supabase.from("product_colors").delete().eq("product_id", id);
    const { error: delSizes } = await supabase.from("product_sizes").delete().eq("product_id", id);
    if (delColors || delSizes) {
      return NextResponse.json({ error: (delColors ?? delSizes)!.message }, { status: 500 });
    }

    const variantError = await saveVariants(supabase, id, colors, sizes ?? [], unavailable ?? []);
    if (variantError) {
      console.error("PRODUCT UPDATE — variants failed:", variantError);
      return NextResponse.json({ error: variantError }, { status: 500 });
    }
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
