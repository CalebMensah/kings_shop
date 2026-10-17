import { notFound } from "next/navigation";
import { PageHeader } from "@/components/admin/PageHeader";
import { OrderActions } from "@/components/admin/OrderActions";
import { createClient } from "@/lib/supabase/server";
import Image from "next/image";
import { ORDER_STATUS_LABELS, PAYMENT_STATUS_LABELS, type OrderStatus, type PaymentStatus } from "@/lib/orders";
import { HiOutlineUser, HiOutlineClipboardList, HiOutlineCreditCard } from "react-icons/hi";

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

    const { data: order } = await supabase
    .from("orders")
    .select(
      `*,
      customer:customers(full_name, phone, email),
      order_items(*, product:products(name)),
      payment_transactions(*),
      batch:preorder_batches(name)`
    )
    .eq("id", id)
    .single();

  if (!order) notFound();

  return (
    <div>
      <PageHeader
        title={order.order_number}
        description={`Placed ${new Date(order.created_at).toLocaleString("en-GB")}`}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white border border-navy-100 rounded p-4 md:p-5">
            <h3 className="font-medium text-navy-900 text-sm mb-3 flex items-center gap-2">
              <HiOutlineClipboardList className="w-4 h-4 text-navy-400" /> Items
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[420px]">
                <tbody>
                                    {order.order_items.map((item: any) => (
                    <tr key={item.id} className="border-t border-navy-50 first:border-t-0">
                      <td className="py-2 pr-3 w-12">
                        {item.image_url ? (
                          <div className="relative w-10 h-10 rounded overflow-hidden bg-navy-50 shrink-0">
                            <Image src={item.image_url} alt={item.product_name} fill className="object-cover" sizes="40px" />
                          </div>
                        ) : (
                          <div className="w-10 h-10 rounded bg-navy-50 shrink-0" />
                        )}
                      </td>
                      <td className="py-2 text-navy-700">
                        <p>{item.product_name}</p>
                            {(item.variant_label || item.color_name || item.size_value) && (
                          <p className="text-xs text-navy-400 mt-0.5">
                            {item.variant_label ?? [item.color_name, item.size_value].filter(Boolean).join(" / ")}
                          </p>
                        )}
                      </td>
                      <td className="py-2 text-navy-400 text-center whitespace-nowrap">× {item.quantity}</td>
                      <td className="py-2 text-navy-900 text-right whitespace-nowrap">GH₵{item.line_total}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="border-t border-navy-100 mt-3 pt-3 space-y-1 text-sm">
              <div className="flex justify-between text-navy-500">
                <span>Subtotal</span>
                <span>GH₵{order.subtotal}</span>
              </div>
              <div className="flex justify-between text-navy-500">
                <span>Delivery</span>
                <span>GH₵{order.delivery_fee}</span>
              </div>
              <div className="flex justify-between text-navy-900 font-medium">
                <span>Total</span>
                <span>GH₵{order.total}</span>
              </div>
            </div>
          </div>

          <div className="bg-white border border-navy-100 rounded p-4 md:p-5">
            <h3 className="font-medium text-navy-900 text-sm mb-3 flex items-center gap-2">
              <HiOutlineUser className="w-4 h-4 text-navy-400" /> Customer
            </h3>
            {order.customer ? (
              <>
                <p className="text-sm text-navy-700">{order.customer.full_name}</p>
                <p className="text-sm text-navy-500">{order.customer.phone}</p>
                {order.customer.email && <p className="text-sm text-navy-500">{order.customer.email}</p>}
              </>
            ) : (
              <p className="text-sm text-red-500">Customer record unavailable</p>
            )}
            <p className="text-sm text-navy-500 mt-2">
              {order.fulfillment_type === "delivery" ? order.delivery_address : "Pickup"}
            </p>
            {order.notes && (
              <p className="text-sm text-navy-500 mt-2 italic">&ldquo;{order.notes}&rdquo;</p>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white border border-navy-100 rounded p-4 md:p-5 space-y-2 text-sm">
            <h3 className="font-medium text-navy-900 text-sm mb-1 flex items-center gap-2">
              <HiOutlineCreditCard className="w-4 h-4 text-navy-400" /> Payment
            </h3>
            <div className="flex justify-between">
              <span className="text-navy-500">Batch</span>
              <span className="text-navy-900">{(order as any).batch?.name ?? "Waiting for next batch"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-navy-500">Status</span>
              <span className="text-navy-900">{ORDER_STATUS_LABELS[order.status as OrderStatus]}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-navy-500">Payment</span>
              <span className="text-navy-900">{PAYMENT_STATUS_LABELS[order.payment_status as PaymentStatus]}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-navy-500">Channel</span>
              <span className="text-navy-900">
                {order.payment_channel === "bank_transfer" ? "Bank Transfer" : "Mobile Money"}
              </span>
            </div>
          </div>

          <OrderActions
            orderId={order.id}
            currentStatus={order.status as OrderStatus}
            currentPaymentStatus={order.payment_status as PaymentStatus}
          />
        </div>
      </div>
    </div>
  );
}
