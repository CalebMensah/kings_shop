import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { productSchema } from "@/lib/validation/product";
import { saveVariants } from "@/lib/product-variants";

function slugify(name: string) {
  return name.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const page = Number(searchParams.get("page") ?? "1");
  const pageSize = 20;

  const { data, error, count } = await supabase
    .from("products")
    .select("*, category:categories(name), product_images(image_url, sort_order), product_colors(id, color_name, image_url)", { count: "exact" })
    .order("created_at", { ascending: false })
    .range((page - 1) * pageSize, page * pageSize - 1);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ products: data, total: count });
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const parsed = productSchema.safeParse(body);
  if (!parsed.success) {
    console.error("PRODUCT CREATE — validation failed:", JSON.stringify(parsed.error.flatten()));
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { colors, sizes, unavailable, ...productData } = parsed.data;
  const images: string[] = body.images ?? [];

  if (images.length === 0 && colors.length === 0) {
    return NextResponse.json({ error: "Add at least one product image, or a color with a photo" }, { status: 400 });
  }

  let slug = slugify(productData.name);
  const { data: existing } = await supabase.from("products").select("id").eq("slug", slug).maybeSingle();
  if (existing) slug = `${slug}-${Date.now().toString(36)}`;

  const { data: product, error: productError } = await supabase
    .from("products")
    .insert({ ...productData, slug })
    .select()
    .single();

  if (productError) {
    console.error("PRODUCT CREATE — insert failed:", productError.message);
    return NextResponse.json({ error: productError.message }, { status: 500 });
  }

  if (images.length > 0) {
    await supabase.from("product_images").insert(
      images.map((url: string, i: number) => ({ product_id: product.id, image_url: url, sort_order: i }))
    );
  }

  const variantError = await saveVariants(supabase, product.id, colors, sizes, unavailable);
  if (variantError) {
    console.error("PRODUCT CREATE — variants failed:", variantError);
    return NextResponse.json({ error: variantError }, { status: 500 });
  }

  return NextResponse.json({ product }, { status: 201 });
}
