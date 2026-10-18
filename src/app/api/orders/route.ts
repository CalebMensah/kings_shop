import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkRateLimit } from "@/lib/rate-limit";
import { z } from "zod";

const orderSchema = z.object({
  customerName: z.string().trim().min(2).max(100),
  customerPhone: z.string().trim().regex(/^0\d{9}$/, "Enter a valid 10-digit phone number"),
  customerEmail: z.string().email().optional().or(z.literal("")),
  fulfillmentType: z.enum(["delivery", "pickup"]),
  deliveryAddress: z.string().trim().max(300).optional(),
  paymentChannel: z.enum(["mobile_money", "bank_transfer"]),
  notes: z.string().trim().max(500).optional(),
    agreedToPolicy: z.literal(true, { message: "You must agree to the terms" }),
  items: z
    .array(
      z.object({
        productId: z.string().uuid(),
        variantId: z.string().uuid().optional(),
        quantity: z.number().int().positive().max(50),
      })
    )
    .min(1, "Cart is empty"),
});

export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for") ?? "unknown";
  const { allowed } = checkRateLimit(`order:${ip}`);
  if (!allowed) {
    return NextResponse.json({ error: "Too many order attempts. Please wait a few minutes and try again." }, { status: 429 });
  }

  const body = await request.json();
  const parsed = orderSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const data = parsed.data;

  if (data.fulfillmentType === "delivery" && !data.deliveryAddress) {
    return NextResponse.json({ error: "Delivery address is required" }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { data: settings } = await supabase.from("store_settings").select("delivery_fee_default").single();
  const deliveryFee = data.fulfillmentType === "delivery" ? (settings?.delivery_fee_default ?? 0) : 0;

  const { data: result, error } = await supabase.rpc("place_order", {
    p_customer_name: data.customerName,
    p_customer_phone: data.customerPhone,
    p_customer_email: data.customerEmail || null,
    p_fulfillment_type: data.fulfillmentType,
    p_delivery_address: data.deliveryAddress ?? null,
    p_payment_method: "momo_auto",
    p_payment_channel: data.paymentChannel,
    p_notes: data.notes ?? null,
    p_delivery_fee: deliveryFee,
    p_items: data.items.map((i) => ({
      product_id: i.productId,
      variant_id: i.variantId ?? null,
      quantity: i.quantity,
    })),
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ order: result }, { status: 201 });
}
