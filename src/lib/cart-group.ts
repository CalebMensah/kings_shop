import type { CartItem } from "@/lib/cart-context";

export type CartGroup = {
  productId: string;
  name: string;
  slug?: string;
  image: string | null;
  lines: CartItem[];
  quantity: number;
  total: number;
};

/** One group per product, in the order the products were first added */
export function groupCartItems(items: CartItem[]): CartGroup[] {
  const map = new Map<string, CartGroup>();

  for (const item of items) {
    let group = map.get(item.productId);
    if (!group) {
      group = {
        productId: item.productId,
        name: item.name,
        slug: item.slug,
        image: item.image,
        lines: [],
        quantity: 0,
        total: 0,
      };
      map.set(item.productId, group);
    }
    if (!group.slug && item.slug) group.slug = item.slug;
    if (!group.image && item.image) group.image = item.image;

    group.lines.push(item);
    group.quantity += item.quantity;
    group.total += item.price * item.quantity;
  }

  return Array.from(map.values());
}
