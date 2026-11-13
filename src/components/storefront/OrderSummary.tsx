"use client";

import { useMemo } from "react";
import { useCart } from "@/lib/cart-context";
import { groupCartItems } from "@/lib/cart-groups";

export function OrderSummary() {
  const { items, subtotal } = useCart();
  const groups = useMemo(() => groupCartItems(items), [items]);

  return (
    <div className="bg-white border border-navy-100 rounded p-5 h-fit order-1 md:order-2">
      <h3 className="text-sm font-medium text-navy-700 mb-3">Order summary</h3>

      <ul className="space-y-4">
        {groups.map((group) => (
          <li key={group.productId}>
            <div className="flex justify-between gap-3 text-sm">
              <span className="text-navy-800">{group.name}</span>
              <span className="text-navy-900 shrink-0">GH₵{group.total.toFixed(2)}</span>
            </div>
            <ul className="mt-2 flex flex-wrap gap-1.5">
              {group.lines.map((line) => (
                <li
                  key={`${line.productId}-${line.variantId ?? ""}`}
                  className="inline-flex items-center rounded-full bg-navy-50 px-2.5 py-1 text-xs text-navy-700"
                >
                  {line.variantLabel ? `${line.variantLabel} × ${line.quantity}` : `Quantity × ${line.quantity}`}
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>

      <div className="border-t border-navy-100 mt-4 pt-3 flex justify-between font-medium">
        <span className="text-navy-700">Subtotal</span>
        <span className="text-navy-900">GH₵{subtotal.toFixed(2)}</span>
      </div>
    </div>
  );
}
