import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { ALLOWED_TRANSITIONS, type OrderStatus } from "@/lib/orders";
import { z } from "zod";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("orders")
    .select(
      `*,
      customer:customers(full_name, phone, email),
      order_items(*, product:products(name)),
      payment_transactions(*)`
    )
    .eq("id", id)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 404 });
  return NextResponse.json({ order: data });
}

const updateSchema = z.object({
  status: z.enum(["pending", "confirmed", "preparing", "ready", "completed", "cancelled"]).optional(),
  payment_status: z.enum(["unpaid", "pending_confirmation", "paid", "failed"]).optional(),
  payment_reference: z.string().max(200).optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { data: currentOrder } = await supabase
    .from("orders")
    .select("status, payment_status")
    .eq("id", id)
    .single();

  if (!currentOrder) return NextResponse.json({ error: "Order not found" }, { status: 404 });

  // Enforce valid status transitions server-side — don't trust the client to only send valid ones
  if (parsed.data.status) {
    const currentStatus = currentOrder.status as OrderStatus;
    const allowed = ALLOWED_TRANSITIONS[currentStatus];
    if (!allowed.includes(parsed.data.status)) {
      return NextResponse.json(
        { error: `Cannot move order from "${currentStatus}" to "${parsed.data.status}"` },
        { status: 400 }
      );
    }
  }

  const { data: updatedOrder, error } = await supabase
    .from("orders")
    .update({ ...parsed.data, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    if (parsed.data.status === "cancelled") {
    const { error: restockError } = await supabase.rpc("restock_order", { p_order_id: id });
    if (restockError) console.error("RESTOCK ERROR:", restockError.message);
    }

  // If payment just got manually confirmed, log the transaction + trigger notification
  if (parsed.data.payment_status === "paid" && currentOrder.payment_status !== "paid") {
    await supabase.from("payment_transactions").insert({
      order_id: id,
      provider: "manual",
      provider_reference: parsed.data.payment_reference ?? null,
      amount: updatedOrder.total,
      status: "success",
    });

    // TODO: wire in once notifications service is built
    // await sendOrderNotification(id, "payment_confirmed");
  }

  // TODO: fire notification on any status change once notifications service exists
  // if (parsed.data.status) await sendOrderNotification(id, "status_updated");

  return NextResponse.json({ order: updatedOrder });
}
