import Link from "next/link";
import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyPaystackTransaction } from "@/lib/paystack";
import { SHIPPING_INFO } from "@/lib/constants";
import { OrderNumberSaveNotice } from "@/components/storefront/OrderNumberSaveNotice";

const ORDER_FIELDS =
  "order_number, total, payment_method, payment_status, fulfillment_type, contains_preorder";

export default async function OrderConfirmationPage({
  params,
  searchParams,
}: {
  params: Promise<{ orderNumber: string }>;
  searchParams: Promise<{ reference?: string; trxref?: string }>;
}) {
  const { orderNumber } = await params;
  const { reference } = await searchParams;
  const supabase = createAdminClient();

  let { data: order, error } = await supabase
    .from("orders")
    .select(ORDER_FIELDS)
    .eq("order_number", orderNumber)
    .single();

  if (error || !order) {
    notFound();
  }

  if (reference && order.payment_status !== "paid") {
    try {
      const verified = await verifyPaystackTransaction(reference);
      if (verified.status === "success") {
        await supabase
          .from("orders")
          .update({ payment_status: "paid", status: "confirmed" })
          .eq("order_number", orderNumber)
          .eq("payment_status", "unpaid");

        const refreshed = await supabase
          .from("orders")
          .select(ORDER_FIELDS)
          .eq("order_number", orderNumber)
          .single();
        order = refreshed.data ?? order;
      }
    } catch {
      // verification failed, leave the status as it is. The webhook may still resolve it.
    }
  }

  // Private setting: read on the server only, only for paid orders, and only when
  // the order has preorder items (orders made only of in-stock items don't ship by sea)
  const groupUrl =
    order.payment_status === "paid" && order.contains_preorder
      ? process.env.SHIPPING_GROUP_URL
      : undefined;

  return (
    <div className="max-w-lg mx-auto px-4 py-16 md:py-20 text-center">
      <h1 className="font-display text-2xl text-navy-900 mb-2">
        {order.payment_status === "paid" ? "Payment confirmed" : "Order placed"}
      </h1>
      <p className="text-navy-500 mb-6">
        Order number <span className="text-navy-900 font-medium">{order.order_number}</span>
      </p>

      <OrderNumberSaveNotice orderNumber={order.order_number} />

      {order.payment_status === "paid" ? (
        <>
          <p className="text-sm text-navy-600 bg-turquoise/10 rounded p-4 mb-4">
            We&apos;ve received your payment of GH₵{order.total}. We&apos;ll start preparing your order.
          </p>
          {groupUrl && (
            <div className="border border-navy-100 rounded p-4 mb-6 text-left">
              <p className="text-sm text-navy-700 font-medium mb-1">Shipping updates</p>
              <p className="text-xs text-navy-500 mb-3 leading-relaxed">{SHIPPING_INFO.disclaimer}</p>
              <a
                href={groupUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block bg-navy-800 text-white text-sm px-4 py-2 rounded hover:bg-navy-700 transition"
              >
                Join shipping updates group
              </a>
            </div>
          )}
        </>
      ) : (
        <p className="text-sm text-navy-600 bg-amber-50 rounded p-4 mb-6">
          We&apos;re still confirming your payment — this can take a minute. Refresh this page shortly, or
          contact us if it doesn&apos;t update.
        </p>
      )}

      <Link href="/shop" className="text-ocean hover:underline text-sm">Continue shopping</Link>
    </div>
  );
}
