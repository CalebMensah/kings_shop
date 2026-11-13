"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

export type CartItem = {
  productId: string;
  slug?: string;
  variantId?: string;
  colorId?: string;
  sizeId?: string;
  name: string;
  variantLabel?: string;
  price: number;
  image: string | null;
  quantity: number;
  moq?: number;
  isPreorder: boolean;
  maxStock: number;
};

type CartContextValue = {
  items: CartItem[];
  addItem: (item: CartItem) => void;
  addItems: (items: CartItem[]) => void;
  removeItem: (productId: string, variantId?: string) => void;
  updateQuantity: (productId: string, quantity: number, variantId?: string) => void;
  clearCart: () => void;
  subtotal: number;
  itemCount: number;
};

const CartContext = createContext<CartContextValue | null>(null);

// New key: carts saved by the older version are left behind (they have no product links)
const STORAGE_KEY = "shop-cart-v3";

const sameLine = (a: CartItem, b: { productId: string; variantId?: string }) =>
  a.productId === b.productId && (a.variantId ?? "") === (b.variantId ?? "");

const floorOf = (item: { moq?: number; maxStock: number }) =>
  Math.max(1, Math.min(item.moq ?? 1, item.maxStock));

function sanitize(raw: unknown): CartItem[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter(
    (i): i is CartItem =>
      Boolean(i) &&
      typeof i.productId === "string" &&
      typeof i.name === "string" &&
      typeof i.price === "number" &&
      typeof i.quantity === "number" &&
      i.quantity > 0 &&
      typeof i.maxStock === "number"
  );
}

function mergeInto(prev: CartItem[], incoming: CartItem[]): CartItem[] {
  const next = [...prev];

  for (const item of incoming) {
    const index = next.findIndex((line) => sameLine(line, item));

    if (index === -1) {
      next.push({
        ...item,
        quantity: Math.min(Math.max(item.quantity, floorOf(item)), item.maxStock),
      });
    } else {
      const existing = next[index];
      // The same combination is never added twice: its quantity goes up instead.
      // Price, photo and stock details are refreshed from the newest add.
      next[index] = {
        ...existing,
        ...item,
        quantity: Math.min(existing.quantity + item.quantity, item.maxStock),
      };
    }
  }

  return next;
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) setItems(sanitize(JSON.parse(stored)));
    } catch {
      // unreadable cart data: start with an empty cart
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      // storage full or blocked: the cart still works for this visit
    }
  }, [items, hydrated]);

  const addItems = useCallback((incoming: CartItem[]) => {
    if (incoming.length === 0) return;
    setItems((prev) => mergeInto(prev, incoming));
  }, []);

  const addItem = useCallback((item: CartItem) => {
    setItems((prev) => mergeInto(prev, [item]));
  }, []);

  const removeItem = useCallback((productId: string, variantId?: string) => {
    setItems((prev) => prev.filter((line) => !sameLine(line, { productId, variantId })));
  }, []);

  const updateQuantity = useCallback((productId: string, quantity: number, variantId?: string) => {
    setItems((prev) =>
      prev.map((line) =>
        sameLine(line, { productId, variantId })
          ? { ...line, quantity: Math.min(Math.max(quantity, floorOf(line)), line.maxStock) }
          : line
      )
    );
  }, []);

  const clearCart = useCallback(() => setItems([]), []);

  const value = useMemo<CartContextValue>(
    () => ({
      items,
      addItem,
      addItems,
      removeItem,
      updateQuantity,
      clearCart,
      subtotal: items.reduce((sum, i) => sum + i.price * i.quantity, 0),
      itemCount: items.reduce((sum, i) => sum + i.quantity, 0),
    }),
    [items, addItem, addItems, removeItem, updateQuantity, clearCart]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
