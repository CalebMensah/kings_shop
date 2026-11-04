import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkRateLimit } from "@/lib/rate-limit";
import { z } from "zod";

const schema = z.object({
  orderNumber: z.string().trim().min(1),
  phone: z.string().trim().regex(/^0\d{9}$/, "Enter a valid phone number"),
});

const ORDER_FIELDS =
  "order_number, status, payment_status, fulfillment_type, total, created_at, contains_preorder, customer:customers!inner(phone), order_items(product_name, variant_label, quantity, line_total)";

export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for") ?? "unknown";
  const { allowed } = checkRateLimit(`track:${ip}`);
  if (!allowed) {
    return NextResponse.json({ error: "Too many attempts. Please wait a few minutes." }, { status: 429 });
  }

  const body = await request.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Enter a valid order number and phone number" }, { status: 400 });
  }

  const supabase = createAdminClient();

  // Both the order number and the matching phone are required
  const { data: order } = await supabase
    .from("orders")
    .select(ORDER_FIELDS)
    .eq("order_number", parsed.data.orderNumber.toUpperCase())
    .eq("customer.phone", parsed.data.phone)
    .single();

  if (!order) {
    return NextResponse.json({ error: "No order found with that order number and phone number" }, { status: 404 });
  }

  // The group link is only sent for a paid order that has preorder items
  const groupUrl =
    order.payment_status === "paid" && order.contains_preorder
      ? process.env.SHIPPING_GROUP_URL ?? null
      : null;

  return NextResponse.json({ order, groupUrl });
}
