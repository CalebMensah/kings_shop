"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCart } from "@/lib/cart-context";
import { BUSINESS } from "@/lib/constants";
import { SHIPPING_INFO } from "@/lib/constants";
import { HiOutlineHome, HiOutlineTruck, HiOutlineDeviceMobile, HiOutlineOfficeBuilding } from "react-icons/hi";

export default function CheckoutPage() {
  const router = useRouter();
  const { items, subtotal, clearCart } = useCart();

  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [fulfillmentType, setFulfillmentType] = useState<"delivery" | "pickup">("pickup");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [paymentChannel, setPaymentChannel] = useState<"mobile_money" | "bank_transfer">("mobile_money");
  const [notes, setNotes] = useState("");
  const [agreedToPolicy, setAgreedToPolicy] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (items.length === 0) {
    return (
      <div className="max-w-lg mx-auto px-4 py-20 text-center text-navy-500">
        Your cart is empty — add something from the shop first.
      </div>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const res = await fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        customerName,
        customerPhone,
        customerEmail: customerEmail || undefined,
        fulfillmentType,
        deliveryAddress: fulfillmentType === "delivery" ? deliveryAddress : undefined,
        paymentChannel,
        notes: notes || undefined,
        agreedToPolicy,
          items: items.map((i) => ({
          productId: i.productId,
          variantId: i.variantId,
          quantity: i.quantity,
        })),
      }),
    });

    const responseData = await res.json();

    if (!res.ok) {
      setSubmitting(false);
      setError(typeof responseData.error === "string" ? responseData.error : "Something went wrong — check your details and try again.");
      return;
    }

    const orderNumber = responseData.order.order_number;

    // Every order now goes straight to Paystack — no manual/pending path from checkout
    const payRes = await fetch("/api/payments/paystack/initialize", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderNumber }),
    });
    const payData = await payRes.json();

    setSubmitting(false);

    if (!payRes.ok) {
      setError(payData.error ?? "Could not start payment. Your order was saved — please contact us to complete payment.");
      return;
    }

    clearCart();
    window.location.href = payData.authorizationUrl;
  }

  return (
    <div className="max-w-3xl mx-auto px-4 md:px-6 py-10 grid md:grid-cols-3 gap-8">
      <form onSubmit={handleSubmit} className="md:col-span-2 space-y-6 order-2 md:order-1">
        <h1 className="font-display text-2xl text-navy-900">Checkout</h1>

        {error && <p className="text-sm text-red-600 bg-red-50 rounded p-3">{error}</p>}

        <div>
          <h2 className="text-sm font-medium text-navy-700 mb-3">Your details</h2>
          <div className="space-y-3">
            <input
              required
              placeholder="Full name"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              className="w-full border border-navy-100 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-turquoise"
            />
            <input
              required
              placeholder="Phone number (e.g. 0247288663)"
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
              className="w-full border border-navy-100 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-turquoise"
            />
            <input
              type="email"
              placeholder="Email (optional)"
              value={customerEmail}
              onChange={(e) => setCustomerEmail(e.target.value)}
              className="w-full border border-navy-100 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-turquoise"
            />
          </div>
        </div>

        <div>
          <h2 className="text-sm font-medium text-navy-700 mb-3">Fulfillment</h2>
          <div className="flex gap-3 mb-3">
            <button
              type="button"
              onClick={() => setFulfillmentType("pickup")}
              className={`flex-1 flex items-center justify-center gap-2 border rounded px-3 py-2 text-sm ${fulfillmentType === "pickup" ? "border-navy-800 bg-navy-800 text-white" : "border-navy-100 text-navy-700"}`}
            >
              <HiOutlineHome className="w-4 h-4" /> Pickup
            </button>
            <button
              type="button"
              onClick={() => setFulfillmentType("delivery")}
              className={`flex-1 flex items-center justify-center gap-2 border rounded px-3 py-2 text-sm ${fulfillmentType === "delivery" ? "border-navy-800 bg-navy-800 text-white" : "border-navy-100 text-navy-700"}`}
            >
              <HiOutlineTruck className="w-4 h-4" /> Delivery
            </button>
          </div>
          {fulfillmentType === "pickup" ? (
            <p className="text-xs text-navy-400">Pickup location: {BUSINESS.location}</p>
          ) : (
            <textarea
              required
              placeholder="Delivery address"
              value={deliveryAddress}
              onChange={(e) => setDeliveryAddress(e.target.value)}
              rows={2}
              className="w-full border border-navy-100 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-turquoise"
            />
          )}
        </div>

        <div>
          <h2 className="text-sm font-medium text-navy-700 mb-3">Payment method</h2>
          <p className="text-xs text-navy-400 mb-3">All payments are processed instantly and securely via Paystack.</p>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setPaymentChannel("mobile_money")}
              className={`flex flex-col items-center gap-2 border rounded p-3 text-sm ${paymentChannel === "mobile_money" ? "border-navy-800 bg-navy-800 text-white" : "border-navy-100 text-navy-700"}`}
            >
              <HiOutlineDeviceMobile className="w-5 h-5" />
              Mobile Money
            </button>
            <button
              type="button"
              onClick={() => setPaymentChannel("bank_transfer")}
              className={`flex flex-col items-center gap-2 border rounded p-3 text-sm ${paymentChannel === "bank_transfer" ? "border-navy-800 bg-navy-800 text-white" : "border-navy-100 text-navy-700"}`}
            >
              <HiOutlineOfficeBuilding className="w-5 h-5" />
              Bank Transfer
            </button>
          </div>
        </div>

        <textarea
          placeholder="Order notes (optional)"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          className="w-full border border-navy-100 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-turquoise"
        />

          <div className="border border-amber-200 bg-amber-50 rounded p-3">
          <p className="text-xs text-amber-800 leading-relaxed">
            <strong>Shipping is not included in the price shown.</strong> {SHIPPING_INFO.disclaimer}
          </p>
        </div>

        <label className="flex items-start gap-2 text-xs text-navy-500">
          <input
            type="checkbox"
            checked={agreedToPolicy}
            onChange={(e) => setAgreedToPolicy(e.target.checked)}
            className="mt-0.5"
          />
          <span>
            By proceeding to payment, you agree to our{" "}
            <Link href="/terms" target="_blank" className="text-ocean hover:underline">
              Terms &amp; Conditions
            </Link>
            .
          </span>
        </label>

        <button
          type="submit"
          disabled={submitting || !agreedToPolicy}
          className="w-full bg-navy-800 text-white py-3 rounded text-sm font-medium hover:bg-navy-700 transition disabled:opacity-40"
        >
          {submitting ? "Redirecting to payment..." : "Proceed to payment"}
        </button>
      </form>

      <div className="bg-white border border-navy-100 rounded p-5 h-fit order-1 md:order-2">
        <h3 className="text-sm font-medium text-navy-700 mb-3">Order summary</h3>
        {items.map((item) => (
          <div key={`${item.productId}-${item.variantId ?? ""}`} className="flex justify-between text-sm mb-2">
            <span className="text-navy-600">{item.name} × {item.quantity}</span>
            <span className="text-navy-900">GH₵{(item.price * item.quantity).toFixed(2)}</span>
          </div>
        ))}
        <div className="border-t border-navy-100 mt-3 pt-3 flex justify-between font-medium">
          <span className="text-navy-700">Subtotal</span>
          <span className="text-navy-900">GH₵{subtotal.toFixed(2)}</span>
        </div>
      </div>
    </div>
  );
}
