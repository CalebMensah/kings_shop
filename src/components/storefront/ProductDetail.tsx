"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useCart } from "@/lib/cart-context";
import { SHIPPING_INFO, ESTIMATED_ARRIVAL } from "@/lib/constant;
import { OptionButton } from "@/components/storefront/OptionButton";
import { SelectionList, type SelectionRow } from "@/components/storefront/SelectionList";
import {
  HiOutlineCheck,
  HiOutlineCheckCircle,
  HiOutlineClock,
  HiOutlineMinus,
  HiOutlinePlus,
  HiOutlineShoppingBag,
} from "react-icons/hi";

type ProductImage = { image_url: string; sort_order: number };
type SpecOption = { id: string; name: string; image_url: string | null; sort_order: number };
type Spec = { id: string; name: string; sort_order: number; product_spec_options: SpecOption[] };
type RawVariant = {
  id: string;
  price: number | null;
  is_available: boolean;
  stock_quantity: number | null;
  product_variant_options: { option_id: string }[];
};

type Row = {
  key: string;
  variantId: string;
  label: string;
  price: number;
  stock: number;
  inStock: boolean;
  min: number;
  limit: number | null;
  image: string | null;
};

const bySort = (a: { sort_order: number }, b: { sort_order: number }) => a.sort_order - b.sort_order;

export function ProductDetail({
  product,
}: {
  product: {
    id: string;
    slug: string;
    name: string;
    description: string | null;
    price: number;
    moq: number;
    track_stock: boolean;
    stock_quantity: number;
    preorder_fulfillment_note: string | null;
    product_images: ProductImage[];
    product_specs: Spec[];
    product_variants: RawVariant[];
  };
}) {
  const { items, addItems } = useCart();

  const moq = Math.max(1, Number(product.moq) || 1);
  const tracked = Boolean(product.track_stock);
  const basePrice = Number(product.price);

  const images = useMemo(() => [...product.product_images].sort(bySort), [product.product_images]);

  const specs = useMemo(
    () =>
      [...product.product_specs].sort(bySort).map((s) => ({
        ...s,
        options: [...s.product_spec_options].sort(bySort),
      })),
    [product.product_specs]
  );

  const variants = useMemo(
    () =>
      product.product_variants.map((v) => ({
        id: v.id,
        price: v.price != null ? Number(v.price) : basePrice,
        available: v.is_available,
        stock: Math.max(0, Number(v.stock_quantity ?? 0)),
        optionIds: new Set(v.product_variant_options.map((o) => o.option_id)),
      })),
    [product.product_variants, basePrice]
  );

  const availableVariants = useMemo(() => variants.filter((v) => v.available), [variants]);
  const hasSpecs = specs.length > 0;

  // specId -> the option ids chosen in that specification. Nothing is preselected.
  const [selected, setSelected] = useState<Record<string, string[]>>({});
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [plainQty, setPlainQty] = useState(moq);
  const [thumbIndex, setThumbIndex] = useState<number | null>(null);
  const [focusId, setFocusId] = useState<string | null>(null);
  const [added, setAdded] = useState(false);
  const [addedCount, setAddedCount] = useState(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    []
  );

  // ---- Variants that still work with what has been chosen so far ----
  const compatibleVariants = useMemo(
    () =>
      availableVariants.filter((v) =>
        specs.every((s) => {
          const picks = selected[s.id] ?? [];
          return picks.length === 0 || picks.some((id) => v.optionIds.has(id));
        })
      ),
    [availableVariants, specs, selected]
  );

  // An option can be chosen if some available combination has it together with the other choices
  function isSelectable(specId: string, optionId: string) {
    return availableVariants.some(
      (v) =>
        v.optionIds.has(optionId) &&
        specs.every((s) => {
          if (s.id === specId) return true;
          const picks = selected[s.id] ?? [];
          return picks.length === 0 || picks.some((id) => v.optionIds.has(id));
        })
    );
  }

  // ---- One row per chosen combination, shown once ----
  const { rows, skipped } = useMemo(() => {
    if (!hasSpecs) return { rows: [] as Row[], skipped: 0 };

    const picks = specs.map((s) => s.options.filter((o) => (selected[s.id] ?? []).includes(o.id)));
    if (picks.some((p) => p.length === 0)) return { rows: [] as Row[], skipped: 0 };

    let combos: SpecOption[][] = [[]];
    for (const group of picks) {
      combos = combos.flatMap((c) => group.map((o) => [...c, o]));
    }

    const result: Row[] = [];
    for (const combo of combos) {
      const ids = combo.map((o) => o.id);
      const variant = availableVariants.find(
        (v) => v.optionIds.size === ids.length && ids.every((id) => v.optionIds.has(id))
      );
      if (!variant) continue;

      const inStock = tracked && variant.stock > 0;
      const limit = inStock ? variant.stock : null;
      result.push({
        key: variant.id,
        variantId: variant.id,
        label: combo.map((o) => o.name).join(" / "),
        price: variant.price,
        stock: variant.stock,
        inStock,
        min: limit !== null ? Math.min(moq, limit) : moq,
        limit,
        image: combo.find((o) => o.image_url)?.image_url ?? null,
      });
    }
    return { rows: result, skipped: combos.length - result.length };
  }, [hasSpecs, specs, selected, availableVariants, tracked, moq]);

  const qtyOf = (row: Row) => {
    const raw = quantities[row.key];
    if (raw === undefined) return row.min;
    if (raw <= 0) return 0;
    return Math.min(Math.max(raw, row.min), row.limit ?? Number.POSITIVE_INFINITY);
  };

  const rowQty = rows.map((row) => ({ row, qty: qtyOf(row) }));
  const activeRows = rowQty.filter((x) => x.qty > 0);

  // ---- Products without specifications ----
  const plainStock = Math.max(0, Number(product.stock_quantity ?? 0));
  const plainInStock = !hasSpecs && tracked && plainStock > 0;
  const plainLimit = plainInStock ? plainStock : null;
  const plainMin = plainLimit !== null ? Math.min(moq, plainLimit) : moq;
  const plainShown =
    plainLimit !== null ? Math.min(Math.max(plainQty, plainMin), plainLimit) : Math.max(plainQty, plainMin);

  const unitCount = hasSpecs ? activeRows.reduce((n, x) => n + x.qty, 0) : plainShown;
  const total = hasSpecs
    ? activeRows.reduce((sum, x) => sum + x.row.price * x.qty, 0)
    : basePrice * plainShown;

  // ---- Price shown under the title ----
  const pricePool = hasSpecs
    ? activeRows.length > 0
      ? activeRows.map((x) => x.row.price)
      : compatibleVariants.map((v) => v.price)
    : [basePrice];
  const minPrice = pricePool.length > 0 ? Math.min(...pricePool) : basePrice;
  const maxPrice = pricePool.length > 0 ? Math.max(...pricePool) : basePrice;
  const showFrom = hasSpecs && activeRows.length === 0 && minPrice !== maxPrice;
  const priceText =
    activeRows.length > 0 && minPrice !== maxPrice
      ? `GH₵${minPrice.toFixed(2)} – GH₵${maxPrice.toFixed(2)}`
      : `GH₵${minPrice.toFixed(2)}`;

  // ---- Available now, preorder, or a mix ----
  let mode: "available" | "preorder" | "mixed" = "preorder";
  if (tracked) {
    if (!hasSpecs) {
      mode = plainInStock ? "available" : "preorder";
    } else if (activeRows.length > 0) {
      const inStockCount = activeRows.filter((x) => x.row.inStock).length;
      mode = inStockCount === 0 ? "preorder" : inStockCount === activeRows.length ? "available" : "mixed";
    } else if (compatibleVariants.length > 0) {
      const inStockCount = compatibleVariants.filter((v) => v.stock > 0).length;
      mode = inStockCount === 0 ? "preorder" : inStockCount === compatibleVariants.length ? "available" : "mixed";
    }
  }

  const singleLimit = hasSpecs
    ? activeRows.length === 1 && activeRows[0].row.inStock
      ? activeRows[0].row.stock
      : null
    : plainLimit;
  const stockText = singleLimit !== null ? (singleLimit <= 5 ? `Only ${singleLimit} left` : "In stock") : null;

  // ---- Image ----
  const chosenOptions = specs.flatMap((s) => s.options.filter((o) => (selected[s.id] ?? []).includes(o.id)));
  const focusOption =
    chosenOptions.find((o) => o.id === focusId && o.image_url) ?? chosenOptions.find((o) => o.image_url) ?? null;
  const defaultOptionImage = specs.flatMap((s) => s.options).find((o) => o.image_url)?.image_url ?? null;
  const displayedImage =
    thumbIndex !== null
      ? images[thumbIndex]?.image_url ?? null
      : focusOption?.image_url ?? images[0]?.image_url ?? defaultOptionImage;

  // ---- Button ----
  const noneAvailable = hasSpecs && availableVariants.length === 0;
  const firstUnselected = specs.find((s) => (selected[s.id] ?? []).length === 0);

  let blockedLabel: string | null = null;
  if (noneAvailable) blockedLabel = "Not available";
  else if (hasSpecs && activeRows.length === 0) {
    if (firstUnselected) blockedLabel = `Select ${firstUnselected.name}`;
    else if (rows.length === 0) blockedLabel = "Not available";
    else blockedLabel = "Choose a quantity";
  }
  const canAdd = blockedLabel === null;

  const sellsFromStock = hasSpecs ? activeRows.some((x) => x.row.inStock) : plainInStock;
  const buttonLabel = added ? "Added to cart" : blockedLabel ?? (sellsFromStock ? "Add to cart" : "Preorder now");

  const cartQtyFor = (variantId?: string) =>
    items.find((i) => i.productId === product.id && (i.variantId ?? "") === (variantId ?? ""))?.quantity ?? 0;

  const listRows: SelectionRow[] = rowQty.map(({ row, qty }) => ({
    key: row.key,
    label: row.label,
    price: row.price,
    image: row.image,
    note: tracked ? (row.inStock ? (row.stock <= 5 ? `Only ${row.stock} left` : "In stock") : "Preorder") : undefined,
    inCart: cartQtyFor(row.variantId),
    qty,
    atMax: row.limit !== null && qty >= row.limit,
  }));

  // ---- Actions ----
  function toggleOption(specId: string, option: SpecOption) {
    setSelected((prev) => {
      const current = prev[specId] ?? [];
      return {
        ...prev,
        [specId]: current.includes(option.id) ? current.filter((id) => id !== option.id) : [...current, option.id],
      };
    });
    setFocusId(option.id);
    if (option.image_url) setThumbIndex(null);
    setAddedCount(0);
  }

  function stepRow(key: string, delta: 1 | -1) {
    const entry = rowQty.find((x) => x.row.key === key);
    if (!entry) return;
    const { row, qty } = entry;

    let next: number;
    if (delta === 1) {
      next = qty === 0 ? row.min : row.limit !== null ? Math.min(row.limit, qty + 1) : qty + 1;
    } else {
      next = qty <= row.min ? 0 : qty - 1;
    }
    setQuantities((prev) => ({ ...prev, [key]: next }));
    setAddedCount(0);
  }

  function stepPlain(delta: 1 | -1) {
    const next = Math.max(plainMin, plainShown + delta);
    setPlainQty(plainLimit !== null ? Math.min(plainLimit, next) : next);
    setAddedCount(0);
  }

  function flashAdded(count: number) {
    setAdded(true);
    setAddedCount(count);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setAdded(false), 2500);
  }

  function handleAddToCart() {
    if (!canAdd) return;

    if (hasSpecs) {
      addItems(
        activeRows.map(({ row, qty }) => ({
          productId: product.id,
          slug: product.slug,
          variantId: row.variantId,
          name: product.name,
          variantLabel: row.label,
          price: row.price,
          image: row.image ?? images[0]?.image_url ?? defaultOptionImage,
          quantity: qty,
          moq,
          isPreorder: !row.inStock,
          maxStock: row.inStock ? row.stock : 9999,
        }))
      );
      setQuantities({}); // every row goes back to the minimum
      flashAdded(unitCount);
    } else {
      addItems([
        {
          productId: product.id,
          slug: product.slug,
          name: product.name,
          price: basePrice,
          image: displayedImage,
          quantity: plainShown,
          moq,
          isPreorder: !plainInStock,
          maxStock: plainInStock ? plainStock : 9999,
        },
      ]);
      setPlainQty(plainMin);
      flashAdded(plainShown);
    }
  }

  const Icon = added ? HiOutlineCheck : HiOutlineShoppingBag;

  return (
    <div className="max-w-6xl mx-auto px-4 md:px-6 py-6 md:py-10 grid md:grid-cols-2 gap-6 md:gap-10 pb-28 md:pb-10">
      <div>
        <div className="relative aspect-square bg-white border border-navy-100 mb-3">
          {displayedImage && (
            <Image
              src={displayedImage}
              alt={product.name}
              fill
              className="object-cover"
              priority
              sizes="(max-width: 768px) 100vw, 50vw"
            />
          )}
        </div>
        {images.length > 1 && (
          <div className="flex gap-2 overflow-x-auto">
            {images.map((img, i) => (
              <button
                key={img.image_url}
                onClick={() => setThumbIndex(i)}
                className={`relative w-14 h-14 shrink-0 border ${
                  displayedImage === img.image_url ? "border-navy-800" : "border-navy-100"
                }`}
              >
                <Image src={img.image_url} alt="" fill className="object-cover" sizes="56px" />
              </button>
            ))}
          </div>
        )}
      </div>

      <div>
        {mode === "available" ? (
          <span className="inline-flex items-center gap-1 bg-emerald-600 text-white text-xs px-2 py-1 rounded mb-3">
            <HiOutlineCheckCircle className="w-3.5 h-3.5" />
            Available now{stockText ? ` · ${stockText}` : ""}
          </span>
        ) : mode === "mixed" ? (
          <span className="inline-flex items-center gap-1 bg-navy-100 text-navy-700 text-xs px-2 py-1 rounded mb-3">
            <HiOutlineClock className="w-3.5 h-3.5" />
            {activeRows.length > 0
              ? "Some items are in stock, some are preorders"
              : "Availability depends on your choices"}
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 bg-turquoise-dark text-white text-xs px-2 py-1 rounded mb-3">
            <HiOutlineClock className="w-3.5 h-3.5" />
            Preorder — {product.preorder_fulfillment_note || `estimated arrival ${ESTIMATED_ARRIVAL}`}
          </span>
        )}

        <h1 className="font-display text-2xl md:text-3xl text-navy-900">{product.name}</h1>
        <p className="text-lg md:text-xl text-navy-700 mt-2">
          {showFrom && <span className="text-xs text-navy-400 font-normal mr-1.5">from</span>}
          {priceText}
        </p>

        {mode !== "available" && (
          <p className="text-xs text-navy-400 mt-2 leading-relaxed">{SHIPPING_INFO.shortNote}</p>
        )}

        {moq > 1 && <p className="text-xs text-navy-400 mt-1">Minimum order: {moq}</p>}

        {product.description && (
          <p className="text-navy-600 mt-4 leading-relaxed text-sm md:text-base whitespace-pre-line">
            {product.description}
          </p>
        )}

        {hasSpecs && (
          <div id="options" className="scroll-mt-24">
            {specs.some((s) => s.options.length > 1) && (
              <p className="mt-5 text-xs text-navy-400">Tap more than one option to order several at once.</p>
            )}

            {specs.map((spec) => {
              const picked = selected[spec.id] ?? [];
              const pickedNames = spec.options.filter((o) => picked.includes(o.id)).map((o) => o.name);
              return (
                <div key={spec.id} className="mt-4">
                  <p className="text-sm text-navy-700 mb-2">
                    {spec.name}
                    {pickedNames.length === 0 ? (
                      <span className="text-red-500"> · required</span>
                    ) : pickedNames.length <= 2 ? (
                      `: ${pickedNames.join(", ")}`
                    ) : (
                      ` · ${pickedNames.length} selected`
                    )}
                  </p>
                  <div className="flex gap-2 flex-wrap">
                    {spec.options.map((option) => {
                      const chosen = picked.includes(option.id);
                      const selectable = isSelectable(spec.id, option.id);
                      return (
                        <OptionButton
                          key={option.id}
                          name={option.name}
                          imageUrl={option.image_url}
                          chosen={chosen}
                          disabled={!selectable && !chosen}
                          title={selectable || chosen ? option.name : "Not available with your other choices"}
                          onClick={() => toggleOption(spec.id, option)}
                        />
                      );
                    })}
                  </div>
                </div>
              );
            })}

            {noneAvailable && <p className="mt-3 text-xs text-red-500">Nothing is available right now.</p>}

            {skipped > 0 && (
              <p className="mt-3 text-xs text-amber-700">
                {skipped} combination{skipped === 1 ? "" : "s"} of your choices{" "}
                {skipped === 1 ? "isn't" : "aren't"} available and left out.
              </p>
            )}

            {listRows.length > 0 && (
              <div className="mt-5">
                <p className="text-sm text-navy-700 mb-2">Your selection</p>
                <SelectionList rows={listRows} onStep={stepRow} />
                {listRows.length > 1 && (
                  <p className="mt-2 text-xs text-navy-400">Lower a quantity to 0 to leave a combination out.</p>
                )}
              </div>
            )}
          </div>
        )}

        {!hasSpecs && (
          <div className="mt-5 flex items-center gap-3">
            <p className="text-sm text-navy-700">Quantity</p>
            <div className="flex items-center border border-navy-100 rounded">
              <button
                onClick={() => stepPlain(-1)}
                disabled={plainShown <= plainMin}
                className="px-3 py-1.5 text-navy-600 disabled:opacity-30"
                aria-label="Decrease quantity"
              >
                <HiOutlineMinus className="w-4 h-4" />
              </button>
              <span className="px-3 text-sm">{plainShown}</span>
              <button
                onClick={() => stepPlain(1)}
                disabled={plainLimit !== null && plainShown >= plainLimit}
                className="px-3 py-1.5 text-navy-600 disabled:opacity-30"
                aria-label="Increase quantity"
              >
                <HiOutlinePlus className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {canAdd && (
          <p className="mt-5 text-sm text-navy-600">
            Total ({unitCount} item{unitCount === 1 ? "" : "s"}):{" "}
            <span className="font-medium text-navy-900">GH₵{total.toFixed(2)}</span>
          </p>
        )}

        <button
          onClick={handleAddToCart}
          disabled={!canAdd}
          className="hidden md:flex mt-4 items-center justify-center gap-2 bg-navy-800 text-white px-8 py-3 rounded text-sm font-medium hover:bg-navy-700 transition disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Icon className="w-4 h-4" />
          {buttonLabel}
        </button>

        {addedCount > 0 && (
          <p className="mt-3 flex flex-wrap items-center gap-1.5 text-sm text-emerald-700">
            <HiOutlineCheckCircle className="w-4 h-4" />
            {addedCount} item{addedCount === 1 ? "" : "s"} added to your cart.
            <Link href="/cart" className="underline">View cart</Link>
          </p>
        )}
      </div>

      <div className="md:hidden fixed bottom-0 inset-x-0 bg-white border-t border-navy-100 p-4 z-40">
        <button
          onClick={handleAddToCart}
          disabled={!canAdd}
          className="w-full flex items-center justify-center gap-2 bg-navy-800 text-white py-3 rounded text-sm font-medium disabled:opacity-40"
        >
          <Icon className="w-4 h-4" />
          {canAdd && !added ? `${buttonLabel} · GH₵${total.toFixed(2)}` : buttonLabel}
        </button>
      </div>
    </div>
  );
}
