import { z } from "zod";

export const productColorSchema = z.object({
  client_id: z.string(),
  color_name: z.string().trim().min(1, "Color name is required").max(50),
  image_url: z.string().url("Upload an image for this color"),
});

export const productSizeSchema = z.object({
  client_id: z.string(),
  size_value: z.string().trim().min(1, "Size is required").max(30),
  // null = use the product's base price
  price: z.number().min(0, "Price can't be negative").nullable().default(null),
});

export const unavailableComboSchema = z.object({
  color_client_id: z.string(),
  size_client_id: z.string(),
});

export const productSchema = z.object({
  name: z.string().trim().min(2, "Name is too short").max(150),
  description: z.string().trim().max(3000).optional(),
  price: z.coerce.number().positive("Price must be greater than 0"),
  category_id: z.string().uuid("Choose a category"),
  moq: z.coerce.number().int().min(1, "MOQ must be at least 1").default(1),
  preorder_fulfillment_note: z.string().trim().max(200).optional(),
  status: z.enum(["active", "draft", "archived"]).default("active"),
  colors: z.array(productColorSchema).optional().default([]),
  sizes: z.array(productSizeSchema).optional().default([]),
  unavailable: z.array(unavailableComboSchema).optional().default([]),
});

export type ProductInput = z.infer<typeof productSchema>;

export const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
export const MAX_IMAGE_SIZE_BYTES = 8 * 1024 * 1024;
