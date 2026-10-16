import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

function slugify(name: string) {
  return name.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

const categorySchema = z.object({
  name: z.string().trim().min(2, "Name is too short").max(100),
  image_url: z.string().url().optional(),
  parent_id: z.string().uuid().nullish(),
});

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("categories")
    .select("*, products(count)")
    .order("sort_order")
    .order("name");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ categories: data });
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const parsed = categorySchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { name, image_url, parent_id } = parsed.data;

  // Only two levels: a subcategory can't have its own subcategories
  let parentSlug: string | null = null;
  if (parent_id) {
    const { data: parent } = await supabase
      .from("categories")
      .select("slug, parent_id")
      .eq("id", parent_id)
      .maybeSingle();

    if (!parent) return NextResponse.json({ error: "Parent category not found" }, { status: 400 });
    if (parent.parent_id) {
      return NextResponse.json({ error: "Subcategories can't have their own subcategories" }, { status: 400 });
    }
    parentSlug = parent.slug;
  }

  let slug = slugify(name);
  const { data: clash } = await supabase.from("categories").select("id").eq("slug", slug).maybeSingle();
  if (clash) {
    if (!parentSlug) {
      return NextResponse.json({ error: "A category with this name already exists" }, { status: 400 });
    }
    slug = `${parentSlug}-${slug}`;
    const { data: clash2 } = await supabase.from("categories").select("id").eq("slug", slug).maybeSingle();
    if (clash2) {
      return NextResponse.json({ error: "That subcategory already exists here" }, { status: 400 });
    }
  }

  // Put it last among its siblings
  const { data: last } = parent_id
    ? await supabase
        .from("categories")
        .select("sort_order")
        .eq("parent_id", parent_id)
        .order("sort_order", { ascending: false })
        .limit(1)
        .maybeSingle()
    : await supabase
        .from("categories")
        .select("sort_order")
        .is("parent_id", null)
        .order("sort_order", { ascending: false })
        .limit(1)
        .maybeSingle();

  const { data, error } = await supabase
    .from("categories")
    .insert({
      name,
      slug,
      image_url: image_url ?? null,
      parent_id: parent_id ?? null,
      sort_order: (last?.sort_order ?? 0) + 1,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ category: data }, { status: 201 });
}
