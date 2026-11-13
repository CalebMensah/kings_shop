"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useCart } from "@/lib/cart-context";
import { SHIPPING_INFO } from "@/lib/constants";
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
type ProductColor = { id: string; color_name: string; image_url: string; sort_order: number };
type ProductSize = {
  id: string;
  size_value: string;
  sort_order: number;
  price?: number | null; // newer products: the size's own price
  price_adjustment?: number | null; // older products: an amount added to the base price
};
type UnavailableCombo = { color_id: string; size_id: string };

type Row = {
  key: string;
  colorId?: string;
  sizeId?: string;
  label: string;
  price: number;
  image: string | null;
};

const bySort = (a: { sort_order: number }, b: { sort_order: number }) => a.sort_order - b.sort_order;
const toggle = (list: string[], id: string) =>
  list.includes(id) ? list.filter((x) => x !== id) : [...list, id];

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
    preorder_fulfillment_note: string | null;
    product_images: ProductImage[];
    product_colors: ProductColor[];
    product_sizes: ProductSize[];
    unavailable_combos?: UnavailableCombo[];
  };
  productUrl?: string; // accepted so older pages that still pass it keep compiling
}) {
  const { items, addItems } = useCart();

  const moq = Math.max(1, Number(product.moq) || 1);
  const base = Number(product.price);

  const images = useMemo(() => [...product.product_images].sort(bySort), [product.product_images]);
  const colors = useMemo(() => [...product.product_colors].sort(bySort), [product.product_colors]);
  const sizes = useMemo(() => [...product.product_sizes].sort(bySort), [product.product_sizes]);
  const hasColors = colors.length > 0;
  const hasSizes = sizes.length > 0;
  const hasChoices = hasColors || hasSizes;

  const unavailable = useMemo(
    () => new Set((product.unavailable_combos ?? []).map((u) => `${u.color_id}::${u.size_id}`)),
    [product.unavailable_combos]
  );

  const sizePrices = useMemo(
    () =>
      new Map(
        sizes.map(
          (s) =>
            [s.id, s.price != null ? Number(s.price) : base + Number(s.price_adjustment ?? 0)] as const
        )
      ),
    [sizes, base]
  );

  const [selectedColors, setSelectedColors] = useState<string[]>([]);
  const [selectedSizes, setSelectedSizes] = useState<string[]>([]);
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

  // ---- Every chosen color and size makes one row (one combination, shown once) ----
  const { rows, skipped } = useMemo(() => {
    if (!hasChoices) return { rows: [] as Row[], skipped: 0 };

    const colorPicks: (ProductColor | null)[] = hasColors
      ? colors.filter((c) => selectedColors.includes(c.id))
      : [null];
    const sizePicks: (ProductSize | null)[] = hasSizes
      ? sizes.filter((s) => selectedSizes.includes(s.id))
      : [null];
    if (colorPicks.length === 0 || sizePicks.length === 0) return { rows: [] as Row[], skipped: 0 };

    const result: Row[] = [];
    let left = 0;
    for (const color of colorPicks) {
      for (const size of sizePicks) {
        if (color && size && unavailable.has(`${color.id}::${size.id}`)) {
          left += 1;
          continue;
        }
        result.push({
          key: `${color?.id ?? "none"}::${size?.id ?? "none"}`,
          colorId: color?.id,
          sizeId: size?.id,
          label: [color?.color_name, size?.size_value].filter(Boolean).join(" / "),
          price: size ? sizePrices.get(size.id) ?? base : base,
          image: color?.image_url ?? null,
        });
      }
    }
    return { rows: result, skipped: left };
  }, [hasChoices, hasColors, hasSizes, colors, sizes, selectedColors, selectedSizes, unavailable, sizePrices, base]);

  const qtyOf = (row: Row) => {
    const raw = quantities[row.key];
    if (raw === undefined) return moq;
    return raw <= 0 ? 0 : Math.max(raw, moq);
  };

  const rowQty = rows.map((row) => ({ row, qty: qtyOf(row) }));
  const activeRows = rowQty.filter((x) => x.qty > 0);

  const plainShown = Math.max(plainQty, moq);
  const unitCount = hasChoices ? activeRows.reduce((n, x) => n + x.qty, 0) : plainShown;
  const total = hasChoices ? activeRows.reduce((sum, x) => sum + x.row.price * x.qty, 0) : base * plainShown;

  // ---- Which options can still be chosen ----
  const colorSelectable = (color: ProductColor) =>
    !hasSizes ||
    sizes.some(
      (s) =>
        (selectedSizes.length === 0 || selectedSizes.includes(s.id)) &&
        !unavailable.has(`${color.id}::${s.id}`)
    );
  const sizeSelectable = (size: ProductSize) =>
    !hasColors ||
    colors.some(
      (c) =>
        (selectedColors.length === 0 || selectedColors.includes(c.id)) &&
        !unavailable.has(`${c.id}::${size.id}`)
    );

  const noneAvailable =
    hasColors && hasSizes && colors.every((c) => sizes.every((s) => unavailable.has(`${c.id}::${s.id}`)));

  // ---- Price shown under the title ----
  const pricePool =
    activeRows.length > 0
      ? activeRows.map((x) => x.row.price)
      : hasSizes
        ? (selectedSizes.length > 0 ? sizes.filter((s) => selectedSizes.includes(s.id)) : sizes).map(
            (s) => sizePrices.get(s.id) ?? base
          )
        : [base];
  const minPrice = Math.min(...pricePool);
  const maxPrice = Math.max(...pricePool);
  const showFrom = hasSizes && activeRows.length === 0 && minPrice !== maxPrice;
  const priceText =
    activeRows.length > 0 && minPrice !== maxPrice
      ? `GH₵${minPrice.toFixed(2)} – GH₵${maxPrice.toFixed(2)}`
      : `GH₵${minPrice.toFixed(2)}`;

  // ---- Image ----
  const chosenColors = colors.filter((c) => selectedColors.includes(c.id));
  const focusColor = chosenColors.find((c) => c.id === focusId) ?? chosenColors[0] ?? null;
  const displayedImage =
    thumbIndex !== null
      ? images[thumbIndex]?.image_url ?? null
      : focusColor?.image_url ?? images[0]?.image_url ?? colors[0]?.image_url ?? null;

  // ---- Button ----
  let blockedLabel: string | null = null;
  if (noneAvailable) blockedLabel = "Not available";
  else if (hasChoices && activeRows.length === 0) {
    if (hasColors && selectedColors.length === 0) blockedLabel = "Select Color";
    else if (hasSizes && selectedSizes.length === 0) blockedLabel = "Select Size";
    else if (rows.length === 0) blockedLabel = "Not available";
    else blockedLabel = "Choose a quantity";
  }
  const canAdd = blockedLabel === null;
  const buttonLabel = added ? "Added to cart" : blockedLabel ?? "Preorder now";

  const cartQtyFor = (variantId?: string) =>
    items.find((i) => i.productId === product.id && (i.variantId ?? "") === (variantId ?? ""))?.quantity ?? 0;

  const listRows: SelectionRow[] = rowQty.map(({ row, qty }) => ({
    key: row.key,
    label: row.label,
    price: row.price,
    image: row.image,
    inCart: cartQtyFor(row.key),
    qty,
    atMax: false,
  }));

  // ---- Actions ----
  function toggleColor(color: ProductColor) {
    setSelectedColors((prev) => toggle(prev, color.id));
    setFocusId(color.id);
    setThumbIndex(null);
    setAddedCount(0);
  }

  function toggleSize(size: ProductSize) {
    setSelectedSizes((prev) => toggle(prev, size.id));
    setAddedCount(0);
  }

  function stepRow(key: string, delta: 1 | -1) {
    const entry = rowQty.find((x) => x.row.key === key);
    if (!entry) return;
    const current = entry.qty;
    const next = delta === 1 ? (current === 0 ? moq : current + 1) : current <= moq ? 0 : current - 1;
    setQuantities((prev) => ({ ...prev, [key]: next }));
    setAddedCount(0);
  }

  function stepPlain(delta: 1 | -1) {
    setPlainQty(Math.max(moq, plainShown + delta));
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

    if (hasChoices) {
      addItems(
        activeRows.map(({ row, qty }) => ({
          productId: product.id,
          slug: product.slug,
          variantId: row.key,
          colorId: row.colorId,
          sizeId: row.sizeId,
          name: product.name,
          variantLabel: row.label,
          price: row.price,
          image: row.image ?? displayedImage,
          quantity: qty,
          moq,
          isPreorder: true,
          maxStock: 9999,
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
          price: base,
          image: displayedImage,
          quantity: plainShown,
          moq,
          isPreorder: true,
          maxStock: 9999,
        },
      ]);
      setPlainQty(moq);
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
        {!hasColors && images.length > 1 && (
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
        <span className="inline-flex items-center gap-1 bg-turquoise-dark text-white text-xs px-2 py-1 rounded mb-3">
          <HiOutlineClock className="w-3.5 h-3.5" />
          Preorder{product.preorder_fulfillment_note ? ` — ${product.preorder_fulfillment_note}` : ""}
        </span>

        <h1 className="font-display text-2xl md:text-3xl text-navy-900">{product.name}</h1>
        <p className="text-lg md:text-xl text-navy-700 mt-2">
          {showFrom && <span className="text-xs text-navy-400 font-normal mr-1.5">from</span>}
          {priceText}
        </p>

        <p className="text-xs text-navy-400 mt-2 leading-relaxed">{SHIPPING_INFO.shortNote}</p>

        {moq > 1 && <p className="text-xs text-navy-400 mt-1">Minimum order: {moq}</p>}

        {product.description && (
          <p className="text-navy-600 mt-4 leading-relaxed text-sm md:text-base whitespace-pre-line">
            {product.description}
          </p>
        )}

        {hasChoices && (
          <div id="options" className="scroll-mt-24">
            {(colors.length > 1 || sizes.length > 1) && (
              <p className="mt-5 text-xs text-navy-400">Tap more than one option to order several at once.</p>
            )}

            {hasColors && (
              <div className="mt-4">
                <p className="text-sm text-navy-700 mb-2">
                  Color
                  {chosenColors.length === 0 ? (
                    <span className="text-red-500"> · required</span>
                  ) : chosenColors.length <= 2 ? (
                    `: ${chosenColors.map((c) => c.color_name).join(", ")}`
                  ) : (
                    ` · ${chosenColors.length} selected`
                  )}
                </p>
                <div className="flex gap-2 flex-wrap">
                  {colors.map((color) => {
                    const chosen = selectedColors.includes(color.id);
                    const selectable = colorSelectable(color);
                    return (
                      <OptionButton
                        key={color.id}
                        name={color.color_name}
                        imageUrl={color.image_url}
                        chosen={chosen}
                        disabled={!selectable && !chosen}
                        title={selectable || chosen ? color.color_name : "Not available in your chosen sizes"}
                        onClick={() => toggleColor(color)}
                      />
                    );
                  })}
                </div>
              </div>
            )}

            {hasSizes && (
              <div className="mt-4">
                <p className="text-sm text-navy-700 mb-2">
                  Size
                  {selectedSizes.length === 0 ? (
                    <span className="text-red-500"> · required</span>
                  ) : selectedSizes.length <= 2 ? (
                    `: ${sizes
                      .filter((s) => selectedSizes.includes(s.id))
                      .map((s) => s.size_value)
                      .join(", ")}`
                  ) : (
                    ` · ${selectedSizes.length} selected`
                  )}
                </p>
                <div className="flex gap-2 flex-wrap">
                  {sizes.map((size) => {
                    const chosen = selectedSizes.includes(size.id);
                    const selectable = sizeSelectable(size);
                    return (
                      <OptionButton
                        key={size.id}
                        name={size.size_value}
                        chosen={chosen}
                        disabled={!selectable && !chosen}
                        title={selectable || chosen ? size.size_value : "Not available in your chosen colors"}
                        onClick={() => toggleSize(size)}
                      />
                    );
                  })}
                </div>
              </div>
            )}

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

        {!hasChoices && (
          <div className="mt-5 flex items-center gap-3">
            <p className="text-sm text-navy-700">Quantity</p>
            <div className="flex items-center border border-navy-100 rounded">
              <button
                onClick={() => stepPlain(-1)}
                disabled={plainShown <= moq}
                className="px-3 py-1.5 text-navy-600 disabled:opacity-30"
                aria-label="Decrease quantity"
              >
                <HiOutlineMinus className="w-4 h-4" />
              </button>
              <span className="px-3 text-sm">{plainShown}</span>
              <button
                onClick={() => stepPlain(1)}
                className="px-3 py-1.5 text-navy-600"
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
