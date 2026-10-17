"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";

export type CartItem = {
  productId: string;
  variantId?: string; // "colorId::sizeId" combo key — kept as one field for uniqueness checks
  colorId?: string;
  sizeId?: string;
  name: string;
  variantLabel?: string; // e.g. "Red / 42"
  price: number;
  image: string | null;
  quantity: number;
  isPreorder: boolean;
  maxStock: number;
};

type CartContextValue = {
  items: CartItem[];
  addItem: (item: CartItem) => void;
  removeItem: (productId: string, variantId?: string) => void;
  updateQuantity: (productId: string, quantity: number, variantId?: string) => void;
  clearCart: () => void;
  subtotal: number;
  itemCount: number;
};

const CartContext = createContext<CartContextValue | null>(null);
const STORAGE_KEY = "jay-imports-cart-v2";

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        setItems(JSON.parse(stored));
      } catch {
        // ignore corrupt cart data
      }
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items, hydrated]);

  const addItem = useCallback((newItem: CartItem) => {
    setItems((prev) => {
      const existing = prev.find(
        (i) => i.productId === newItem.productId && i.variantId === newItem.variantId
      );
      if (existing) {
        return prev.map((i) =>
          i === existing
            ? { ...i, quantity: Math.min(i.quantity + newItem.quantity, i.maxStock) }
            : i
        );
      }
      return [...prev, newItem];
    });
  }, []);

  const removeItem = useCallback((productId: string, variantId?: string) => {
    setItems((prev) => prev.filter((i) => !(i.productId === productId && i.variantId === variantId)));
  }, []);

  const updateQuantity = useCallback((productId: string, quantity: number, variantId?: string) => {
    setItems((prev) =>
      prev.map((i) =>
        i.productId === productId && i.variantId === variantId
          ? { ...i, quantity: Math.max(1, Math.min(quantity, i.maxStock)) }
          : i
      )
    );
  }, []);

  const clearCart = useCallback(() => setItems([]), []);

  const subtotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const itemCount = items.reduce((sum, i) => sum + i.quantity, 0);

  return (
    <CartContext.Provider value={{ items, addItem, removeItem, updateQuantity, clearCart, subtotal, itemCount }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
