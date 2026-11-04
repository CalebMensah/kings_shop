import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const { error } = await supabase.from("store_settings").select("id").limit(1);

  if (error) {
    return NextResponse.json({ status: "error", message: error.message }, { status: 500 });
  }

  // Cancel unpaid checkouts that are holding stock and give the stock back
  const { data: released } = await supabase.rpc("release_stale_orders", { p_minutes: 60 });

  return NextResponse.json({ status: "ok", released: released ?? 0, timestamp: new Date().toISOString() });
}
