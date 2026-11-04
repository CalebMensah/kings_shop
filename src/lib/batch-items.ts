// The only batch file that differs between the Jay and Kings projects.
export const NO_OPTIONS = "No options";

export const ITEM_FIELDS =
  "id, product_id, product_name, variant_label, color_name, size_value, image_url, quantity, line_total, fulfillment";

export type RawItem = {
  id: string;
  product_id: string | null;
  product_name: string;
  variant_label: string | null;
  color_name: string | null;
  size_value: string | null;
  image_url: string | null;
  quantity: number;
  line_total: number;
  fulfillment: string | null;
};

export function itemLabel(item: RawItem): string {
  return (
    item.variant_label ||
    [item.color_name, item.size_value].filter(Boolean).join(" / ") ||
    NO_OPTIONS
  );
}
