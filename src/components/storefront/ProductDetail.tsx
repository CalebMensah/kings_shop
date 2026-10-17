"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { useCart } from "@/lib/cart-context";
import { SHIPPING_INFO } from "@/lib/constants";
import { HiOutlineClock, HiOutlineCheck, HiOutlineShoppingBag, HiOutlineMinus, HiOutlinePlus } from "react-icons/hi";

type ProductImage = { image_url: string; sort_order: number };
type SpecOption = { id: string; name: string; image_url: string | null; sort_order: number };
type Spec = { id: string; name: string; sort_order: number; product_spec_options: SpecOption[] };
type RawVariant = {
  id: string;
  price: number | null;
  is_available: boolean;
  product_variant_options: { option_id: string }[];
};

const bySort = (a: { sort_order: number }, b: { sort_order: number }) => a.sort_order - b.sort_order;

export function ProductDetail({
  product,
}: {
  product: {
    id: string;
    name: string;
    description: string | null;
    price: number;
    moq: number;
    preorder_fulfillment_note: string | null;
    product_images: ProductImage[];
    product_specs: Spec[];
    product_variants: RawVariant[];
  };
}) {
  const { addItem } = useCart();

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
        price: v.price ?? product.price,
        available: v.is_available,
        optionIds: new Set(v.product_variant_options.map((o) => o.option_id)),
      })),
    [product.product_variants, product.price]
  );

  const availableVariants = useMemo(() => variants.filter((v) => v.available), [variants]);
  const hasSpecs = specs.length > 0;

  // specId -> optionId. Nothing is preselected, so the buyer has to choose.
  const [selected, setSelected] = useState<Record<string, string>>({});
  const [thumbIndex, setThumbIndex] = useState<number | null>(null);
  const [quantity, setQuantity] = useState(product.moq);
  const [added, setAdded] = useState(false);

  const selectedIds = Object.values(selected);

  function compatible(ids: string[]) {
    return availableVariants.filter((v) => ids.every((id) => v.optionIds.has(id)));
  }

  // An option can be chosen if some available combination has it together with the other choices made
  function isSelectable(specId: string, optionId: string) {
    const others = Object.entries(selected)
      .filter(([sid]) => sid !== specId)
      .map(([, oid]) => oid);
    return compatible([...others, optionId]).length > 0;
  }

  function handleSelect(spec: { id: string }, option: SpecOption) {
    const next: Record<string, string> = { [spec.id]: option.id };
    const chosen = [option.id];

    // Keep the other choices that still work with this one, drop the rest
    for (const other of specs) {
      if (other.id === spec.id) continue;
      const optionId = selected[other.id];
      if (optionId && compatible([...chosen, optionId]).length > 0) {
        next[other.id] = optionId;
        chosen.push(optionId);
      }
    }

    setSelected(next);
    if (option.image_url) setThumbIndex(null);
  }

  const allSelected = hasSpecs && specs.every((s) => selected[s.id]);
  const resolved = allSelected
    ? availableVariants.find(
        (v) => v.optionIds.size === selectedIds.length && selectedIds.every((id) => v.optionIds.has(id))
      )
    : undefined;

  const candidatePrices = hasSpecs ? compatible(selectedIds).map((v) => v.price) : [];
  const minPrice = candidatePrices.length > 0 ? Math.min(...candidatePrices) : product.price;
  const maxPrice = candidatePrices.length > 0 ? Math.max(...candidatePrices) : product.price;
  const effectivePrice = resolved ? resolved.price : minPrice;
  const showFrom = hasSpecs && !resolved && minPrice !== maxPrice;

  const noneAvailable = hasSpecs && availableVariants.length === 0;
  const firstUnselected = specs.find((s) => !selected[s.id]);
  const canAdd = !noneAvailable && (!hasSpecs || Boolean(resolved));

  const buttonLabel = added
    ? "Added"
    : noneAvailable
      ? "Not available"
      : firstUnselected
        ? `Select ${firstUnselected.name}`
        : hasSpecs && !resolved
          ? "Not available"
          : "Preorder now";

  const selectedOptionImage =
    specs.map((s) => s.options.find((o) => o.id === selected[s.id])?.image_url).find(Boolean) ?? null;
  const defaultOptionImage = specs.flatMap((s) => s.options).find((o) => o.image_url)?.image_url ?? null;

  const displayedImage =
    thumbIndex !== null
      ? images[thumbIndex]?.image_url ?? null
      : selectedOptionImage ?? images[0]?.image_url ?? defaultOptionImage;

  function handleAddToCart() {
    if (!canAdd) return;

    const label = specs
      .map((s) => s.options.find((o) => o.id === selected[s.id])?.name)
      .filter(Boolean)
      .join(" / ");

    addItem({
      productId: product.id,
      variantId: resolved?.id,
      name: product.name,
      variantLabel: label || undefined,
      price: effectivePrice,
      image: displayedImage ?? null,
      quantity,
      isPreorder: true,
      maxStock: 9999,
    });
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  }

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
        <span className="inline-flex items-center gap-1 bg-turquoise-dark text-white text-xs px-2 py-1 rounded mb-3">
          <HiOutlineClock className="w-3.5 h-3.5" />
          Preorder{product.preorder_fulfillment_note ? ` — ${product.preorder_fulfillment_note}` : ""}
        </span>

        <h1 className="font-display text-2xl md:text-3xl text-navy-900">{product.name}</h1>
        <p className="text-lg md:text-xl text-navy-700 mt-2">
          {showFrom && <span className="text-xs text-navy-400 font-normal mr-1.5">from</span>}
          GH₵{effectivePrice.toFixed(2)}
        </p>

        <p className="text-xs text-navy-400 mt-2 leading-relaxed">{SHIPPING_INFO.shortNote}</p>

        {product.moq > 1 && <p className="text-xs text-navy-400 mt-1">Minimum order: {product.moq}</p>}

        {product.description && (
          <p className="text-navy-600 mt-4 leading-relaxed text-sm md:text-base whitespace-pre-line">
            {product.description}
          </p>
        )}

        {specs.map((spec) => {
          const chosen = spec.options.find((o) => o.id === selected[spec.id]);
          return (
            <div key={spec.id} className="mt-5">
              <p className="text-sm text-navy-700 mb-2">
                {spec.name}
                {chosen ? `: ${chosen.name}` : <span className="text-red-500"> · required</span>}
              </p>
              <div className="flex gap-2 flex-wrap">
                {spec.options.map((option) => {
                  const selectable = isSelectable(spec.id, option.id);
                  const isChosen = selected[spec.id] === option.id;
                  const title = selectable ? option.name : "Not available with your other choices";

                  if (option.image_url) {
                    return (
                      <button
                        key={option.id}
                        onClick={() => handleSelect(spec, option)}
                        disabled={!selectable}
                        title={title}
                        aria-label={option.name}
                        className={`relative w-14 h-14 rounded border-2 overflow-hidden disabled:opacity-40 disabled:cursor-not-allowed ${
                          isChosen ? "border-navy-800" : "border-navy-100"
                        }`}
                      >
                        <Image src={option.image_url} alt={option.name} fill className="object-cover" sizes="56px" />
                      </button>
                    );
                  }

                  return (
                    <button
                      key={option.id}
                      onClick={() => handleSelect(spec, option)}
                      disabled={!selectable}
                      title={title}
                      className={`text-sm px-3 py-1.5 rounded border transition disabled:opacity-40 disabled:cursor-not-allowed disabled:line-through ${
                        isChosen
                          ? "border-navy-800 bg-navy-800 text-white"
                          : "border-navy-100 text-navy-700 hover:border-navy-300"
                      }`}
                    >
                      {option.name}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}

        <div className="mt-5 flex items-center gap-3">
          <p className="text-sm text-navy-700">Quantity</p>
          <div className="flex items-center border border-navy-100 rounded">
            <button
              onClick={() => setQuantity((q) => Math.max(product.moq, q - 1))}
              className="px-3 py-1.5 text-navy-600"
              aria-label="Decrease quantity"
            >
              <HiOutlineMinus className="w-4 h-4" />
            </button>
            <span className="px-3 text-sm">{quantity}</span>
            <button
              onClick={() => setQuantity((q) => q + 1)}
              className="px-3 py-1.5 text-navy-600"
              aria-label="Increase quantity"
            >
              <HiOutlinePlus className="w-4 h-4" />
            </button>
          </div>
        </div>

        <button
          onClick={handleAddToCart}
          disabled={!canAdd}
          className="hidden md:flex mt-6 items-center justify-center gap-2 bg-navy-800 text-white px-8 py-3 rounded text-sm font-medium hover:bg-navy-700 transition disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {added ? <HiOutlineCheck className="w-4 h-4" /> : <HiOutlineShoppingBag className="w-4 h-4" />}
          {buttonLabel}
        </button>
      </div>

      <div className="md:hidden fixed bottom-0 inset-x-0 bg-white border-t border-navy-100 p-4 z-40">
        <button
          onClick={handleAddToCart}
          disabled={!canAdd}
          className="w-full flex items-center justify-center gap-2 bg-navy-800 text-white py-3 rounded text-sm font-medium disabled:opacity-40"
        >
          {added ? <HiOutlineCheck className="w-4 h-4" /> : <HiOutlineShoppingBag className="w-4 h-4" />}
          {canAdd && !added ? `Preorder now · GH₵${(effectivePrice * quantity).toFixed(2)}` : buttonLabel}
        </button>
      </div>
    </div>
  );
}
