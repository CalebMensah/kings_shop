import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { cleanSeed, getProductsPage } from "@/lib/products";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const page = Math.min(Math.max(Number(searchParams.get("page") ?? "0") || 0, 0), 1000);
  const category = searchParams.get("category") ?? undefined;
  const search = searchParams.get("search") ?? undefined;
  const seed = cleanSeed(searchParams.get("seed"));

  const supabase = await createClient();
  const result = await getProductsPage(supabase, { page, categorySlug: category, search, seed });

  return NextResponse.json(result);
}
