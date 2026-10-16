"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { useCart } from "@/lib/cart-context";
import { SHIPPING_INFO } from "@/lib/constants";
import { HiOutlineClock, HiOutlineCheck, HiOutlineShoppingBag, HiOutlineMinus, HiOutlinePlus } from "react-icons/hi";

type ProductImage = { image_url: string; sort_order: number };
type ProductColor = { id: string; color_name: string; image_url: string; sort_order: number };
type ProductSize = { id: string; size_value: string; price: number | null; sort_order: number };
type UnavailableCombo = { color_id: string; size_id: string };

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
    product_colors: ProductColor[];
    product_sizes: ProductSize[];
    unavailable_combos: UnavailableCombo[];
  };
}) {
  const { addItem } = useCart();

  const images = [...product.product_images].sort((a, b) => a.sort_order - b.sort_order);
  const colors = [...product.product_colors].sort((a, b) => a.sort_order - b.sort_order);
  const sizes = [...product.product_sizes].sort((a, b) => a.sort_order - b.sort_order);
  const hasColors = colors.length > 0;
  const hasSizes = sizes.length > 0;

  const [selectedColor, setSelectedColor] = useState<ProductColor | null>(colors[0] ?? null);
  const [selectedSize, setSelectedSize] = useState<ProductSize | null>(null);
  const [activeImage, setActiveImage] = useState(0);
  const [quantity, setQuantity] = useState(product.moq);
  const [added, setAdded] = useState(false);

  const unavailable = useMemo(
    () => new Set(product.unavailable_combos.map((u) => `${u.color_id}::${u.size_id}`)),
    [product.unavailable_combos]
  );

  // A size's own price replaces the base price; no price means use the base price
  const sizePrice = (size: ProductSize) => size.price ?? product.price;
  const prices = sizes.map(sizePrice);
  const minPrice = prices.length > 0 ? Math.min(...prices) : product.price;
  const maxPrice = prices.length > 0 ? Math.max(...prices) : product.price;
  const pricesDiffer = minPrice !== maxPrice;

  const isAvailable = (size: ProductSize) =>
    !selectedColor || !unavailable.has(`${selectedColor.id}::${size.id}`);
  const noSizeAvailable = hasSizes && sizes.every((s) => !isAvailable(s));

  const effectivePrice = selectedSize ? sizePrice(selectedSize) : hasSizes ? minPrice : product.price;
  const showFrom = hasSizes && !selectedSize && pricesDiffer;

  const displayedImage = hasColors ? selectedColor?.image_url : images[activeImage]?.image_url;

  const needsSize = hasSizes && !selectedSize;
  const canAdd = !needsSize && !noSizeAvailable;
  const buttonLabel = added
    ? "Added"
    : noSizeAvailable
      ? "Not available"
      : needsSize
        ? "Select a size"
        : "Preorder now";

  function handleSelectColor(color: ProductColor) {
    setSelectedColor(color);
    // Drop the chosen size if this color doesn't come in it
    if (selectedSize && unavailable.has(`${color.id}::${selectedSize.id}`)) {
      setSelectedSize(null);
    }
  }

  function handleAddToCart() {
    if (!canAdd) return;
    addItem({
      productId: product.id,
      variantId:
        selectedColor || selectedSize
          ? `${selectedColor?.id ?? "none"}::${selectedSize?.id ?? "none"}`
          : undefined,
      colorId: selectedColor?.id,
      sizeId: selectedSize?.id,
      name: product.name,
      variantLabel: [selectedColor?.color_name, selectedSize?.size_value].filter(Boolean).join(" / ") || undefined,
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
            <Image src={displayedImage} alt={product.name} fill className="object-cover" priority sizes="(max-width: 768px) 100vw, 50vw" />
          )}
        </div>
        {!hasColors && images.length > 1 && (
          <div className="flex gap-2 overflow-x-auto">
            {images.map((img, i) => (
              <button
                key={img.image_url}
                onClick={() => setActiveImage(i)}
                className={`relative w-14 h-14 shrink-0 border ${i === activeImage ? "border-navy-800" : "border-navy-100"}`}
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

        {product.moq > 1 && (
          <p className="text-xs text-navy-400 mt-1">Minimum order: {product.moq}</p>
        )}

        {product.description && (
          <p className="text-navy-600 mt-4 leading-relaxed text-sm md:text-base">{product.description}</p>
        )}

        {hasColors && (
          <div className="mt-5">
            <p className="text-sm text-navy-700 mb-2">
              Color{selectedColor ? `: ${selectedColor.color_name}` : ""}
            </p>
            <div className="flex gap-2 flex-wrap">
              {colors.map((color) => (
                <button
                  key={color.id}
                  onClick={() => handleSelectColor(color)}
                  className={`relative w-14 h-14 rounded border-2 overflow-hidden ${
                    selectedColor?.id === color.id ? "border-navy-800" : "border-navy-100"
                  }`}
                  aria-label={color.color_name}
                >
                  <Image src={color.image_url} alt={color.color_name} fill className="object-cover" sizes="56px" />
                </button>
              ))}
            </div>
          </div>
        )}

        {hasSizes && (
          <div className="mt-5">
            <p className="text-sm text-navy-700 mb-2">
              Size{!selectedSize && !noSizeAvailable && <span className="text-red-500"> · required</span>}
            </p>
            <div className="flex gap-2 flex-wrap">
              {sizes.map((size) => {
                const available = isAvailable(size);
                return (
                  <button
                    key={size.id}
                    onClick={() => setSelectedSize(size)}
                    disabled={!available}
                    title={!available && selectedColor ? `Not available in ${selectedColor.color_name}` : undefined}
                    className={`text-sm px-3 py-1.5 rounded border transition text-center leading-tight disabled:cursor-not-allowed disabled:opacity-40 disabled:line-through ${
                      selectedSize?.id === size.id
                        ? "border-navy-800 bg-navy-800 text-white"
                        : "border-navy-100 text-navy-700 hover:border-navy-300"
                    }`}
                  >
                    {size.size_value}
                    {pricesDiffer && (
                      <span className="block text-[10px] opacity-70 no-underline">GH₵{sizePrice(size)}</span>
                    )}
                  </button>
                );
              })}
            </div>
            {noSizeAvailable && selectedColor && (
              <p className="text-xs text-red-500 mt-2">No sizes available in {selectedColor.color_name}. Try another color.</p>
            )}
          </div>
        )}

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
            <button onClick={() => setQuantity((q) => q + 1)} className="px-3 py-1.5 text-navy-600" aria-label="Increase quantity">
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
