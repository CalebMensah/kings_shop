"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useCart, type CartItem } from "@/lib/cart-context";
import { groupCartItems } from "@/lib/cart-groups";
import { SHIPPING_INFO } from "@/lib/constants";
import {
  HiOutlineMinus,
  HiOutlinePlus,
  HiOutlineShoppingBag,
  HiOutlineTrash,
  HiOutlineX,
} from "react-icons/hi";

const floorOf = (item: CartItem) => Math.max(1, Math.min(item.moq ?? 1, item.maxStock));

function Stepper({ item, onChange }: { item: CartItem; onChange: (quantity: number) => void }) {
  const atMin = item.quantity <= floorOf(item);
  const atMax = item.quantity >= item.maxStock;

  return (
    <div className="inline-flex shrink-0 items-center rounded-full bg-navy-50">
      <button
        type="button"
        onClick={() => onChange(item.quantity - 1)}
        disabled={atMin}
        className="px-2 py-1.5 text-navy-600 disabled:opacity-30"
        aria-label="Decrease quantity"
      >
        <HiOutlineMinus className="h-3.5 w-3.5" />
      </button>
      <span className="min-w-[1.5rem] text-center text-sm tabular-nums">{item.quantity}</span>
      <button
        type="button"
        onClick={() => onChange(item.quantity + 1)}
        disabled={atMax}
        className="px-2 py-1.5 text-navy-600 disabled:opacity-30"
        aria-label="Increase quantity"
      >
        <HiOutlinePlus className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

/**
 * One chosen combination.
 * Phones: a small card. The name is cut off after one line (tap it to read it in full),
 * the price and quantity sit on the second line.
 * Tablets and up: a single-row pill with the full name.
 */
function VariantPill({
  line,
  onQuantity,
  onRemove,
}: {
  line: CartItem;
  onQuantity: (quantity: number) => void;
  onRemove: () => void;
}) {
  const [open, setOpen] = useState(false);
  const label = line.variantLabel ?? "";

  return (
    <li className="w-full min-w-0 rounded-2xl border border-navy-100 bg-white px-3 py-2 sm:inline-flex sm:w-auto sm:max-w-full sm:items-center sm:gap-2 sm:rounded-full sm:py-1 sm:pl-3 sm:pr-1.5">
      <div className="flex items-center justify-between gap-2 sm:contents">
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          title={label}
          className={`min-w-0 flex-1 text-left text-sm text-navy-800 sm:flex-initial sm:whitespace-normal sm:break-words ${
            open ? "whitespace-normal break-words" : "truncate"
          }`}
        >
          {label}
        </button>
        <button
          type="button"
          onClick={onRemove}
          className="shrink-0 rounded-full p-1 text-navy-300 hover:text-red-500 sm:order-last"
          aria-label={`Remove ${label}`}
        >
          <HiOutlineX className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="mt-1.5 flex items-center justify-between gap-2 sm:mt-0 sm:contents">
        <span className="whitespace-nowrap text-xs text-navy-400">GH₵{line.price.toFixed(2)}</span>
        <Stepper item={line} onChange={onQuantity} />
      </div>
    </li>
  );
}

export default function CartPage() {
  const { items, removeItem, updateQuantity, subtotal } = useCart();
  const groups = useMemo(() => groupCartItems(items), [items]);
  const hasPreorder = items.some((item) => item.isPreorder);

  if (items.length === 0) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 md:py-20 text-center">
        <HiOutlineShoppingBag className="w-10 h-10 text-navy-200 mx-auto mb-3" />
        <p className="text-navy-500 mb-4">Your cart is empty.</p>
        <Link href="/shop" className="text-ocean hover:underline">Browse products</Link>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 md:px-6 py-8 md:py-10 pb-32 md:pb-10">
      <h1 className="font-display text-xl md:text-2xl text-navy-900 mb-6">Your cart</h1>

      <ul className="space-y-5">
        {groups.map((group) => {
          const variantLines = group.lines.filter((line) => line.variantLabel);
          const plainLines = group.lines.filter((line) => !line.variantLabel);

          return (
            <li key={group.productId} className="border-b border-navy-100 pb-5">
              <div className="flex gap-3 md:gap-4">
                <div className="relative w-16 h-16 md:w-20 md:h-20 bg-white border border-navy-100 shrink-0">
                  {group.image && (
                    <Image src={group.image} alt={group.name} fill className="object-cover" sizes="80px" />
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      {group.slug ? (
                        <Link href={`/product/${group.slug}`} className="text-sm text-navy-900 hover:underline">
                          {group.name}
                        </Link>
                      ) : (
                        <p className="text-sm text-navy-900">{group.name}</p>
                      )}
                      <p className="text-xs text-navy-400 mt-0.5">
                        {group.quantity} item{group.quantity === 1 ? "" : "s"}
                      </p>
                    </div>
                    <p className="text-sm text-navy-900 shrink-0">GH₵{group.total.toFixed(2)}</p>
                  </div>

                  {variantLines.length > 0 && (
                    <ul className="mt-3 flex flex-wrap gap-2">
                      {variantLines.map((line) => (
                        <VariantPill
                          key={`${line.productId}-${line.variantId ?? ""}`}
                          line={line}
                          onQuantity={(quantity) => updateQuantity(line.productId, quantity, line.variantId)}
                          onRemove={() => removeItem(line.productId, line.variantId)}
                        />
                      ))}
                    </ul>
                  )}

                  {plainLines.map((line) => (
                    <div key={`${line.productId}-${line.variantId ?? ""}`} className="mt-3 flex items-center gap-3">
                      <span className="text-xs text-navy-500">GH₵{line.price.toFixed(2)} each</span>
                      <Stepper
                        item={line}
                        onChange={(quantity) => updateQuantity(line.productId, quantity, line.variantId)}
                      />
                      <button
                        type="button"
                        onClick={() => removeItem(line.productId, line.variantId)}
                        className="text-red-500 hover:text-red-600"
                        aria-label="Remove item"
                      >
                        <HiOutlineTrash className="h-4 w-4" />
                      </button>
                    </div>
                  ))}

                  {group.slug && variantLines.length > 0 && (
                    <Link
                      href={`/product/${group.slug}#options`}
                      className="mt-3 inline-flex items-center gap-1 text-sm text-ocean hover:underline"
                    >
                      <HiOutlinePlus className="h-3.5 w-3.5" /> Add another option
                    </Link>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      <div className="mt-6 flex justify-between text-base md:text-lg">
        <span className="text-navy-700">Subtotal</span>
        <span className="text-navy-900 font-medium">GH₵{subtotal.toFixed(2)}</span>
      </div>

      {hasPreorder && (
        <p className="text-xs text-navy-400 mt-3 leading-relaxed">{SHIPPING_INFO.disclaimer}</p>
      )}

      <Link
        href="/checkout"
        className="hidden md:block text-center mt-6 bg-navy-800 text-white py-3 rounded text-sm font-medium hover:bg-navy-700 transition"
      >
        Proceed to checkout
      </Link>

      <div className="md:hidden fixed bottom-0 inset-x-0 bg-white border-t border-navy-100 p-4 z-40">
        <Link
          href="/checkout"
          className="block text-center bg-navy-800 text-white py-3 rounded text-sm font-medium"
        >
          Checkout · GH₵{subtotal.toFixed(2)}
        </Link>
      </div>
    </div>
  );
}
