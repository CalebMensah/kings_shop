import { z } from "zod";

export const MAX_SPECS = 5;
export const MAX_OPTIONS_PER_SPEC = 30;
export const MAX_COMBINATIONS = 500;

const optionSchema = z.object({
  client_id: z.string().min(1),
  name: z.string().trim().min(1, "Every option needs a name").max(60, "Option names can be up to 60 characters"),
  image_url: z.string().url("An option photo is invalid").nullable().default(null),
});

const specSchema = z.object({
  client_id: z.string().min(1),
  name: z.string().trim().min(1, "Every specification needs a name").max(40, "Specification names can be up to 40 characters"),
  affects_price: z.boolean().default(false),
  options: z
    .array(optionSchema)
    .min(1, "Every specification needs at least one option")
    .max(MAX_OPTIONS_PER_SPEC, `A specification can have up to ${MAX_OPTIONS_PER_SPEC} options`),
});

const variantSchema = z.object({
  option_client_ids: z.array(z.string().min(1)).min(1),
  // null = use the product's base price
  price: z.number().positive("A combination price must be greater than 0").nullable().default(null),
  is_available: z.boolean().default(true),
});

const productBaseSchema = z.object({
  name: z.string().trim().min(2, "Name is too short").max(150),
  description: z.string().trim().max(3000).optional(),
  price: z.coerce.number().positive("Price must be greater than 0"),
  category_id: z.string().uuid("Choose a category"),
  moq: z.coerce.number().int().min(1, "MOQ must be at least 1").default(1),
  preorder_fulfillment_note: z.string().trim().max(200).optional(),
  status: z.enum(["active", "draft", "archived"]).default("active"),
  specs: z.array(specSchema).max(MAX_SPECS, `A product can have up to ${MAX_SPECS} specifications`).default([]),
  variants: z.array(variantSchema).max(MAX_COMBINATIONS, `A product can have up to ${MAX_COMBINATIONS} combinations`).default([]),
});

export const productSchema = productBaseSchema.superRefine((data, ctx) => {
  const specNames = new Set<string>();
  const optionToSpec = new Map<string, number>();
  let combinations = 1;

  data.specs.forEach((spec, si) => {
    const specKey = spec.name.trim().toLowerCase();
    if (specNames.has(specKey)) {
      ctx.addIssue({ code: "custom", message: `Two specifications are both named "${spec.name}"`, path: ["specs", si, "name"] });
    }
    specNames.add(specKey);

    const optionNames = new Set<string>();
    spec.options.forEach((option, oi) => {
      const optionKey = option.name.trim().toLowerCase();
      if (optionNames.has(optionKey)) {
        ctx.addIssue({ code: "custom", message: `"${spec.name}" has two options named "${option.name}"`, path: ["specs", si, "options", oi, "name"] });
      }
      optionNames.add(optionKey);

      if (optionToSpec.has(option.client_id)) {
        ctx.addIssue({ code: "custom", message: "Duplicate option id", path: ["specs", si, "options", oi, "client_id"] });
      }
      optionToSpec.set(option.client_id, si);
    });

    combinations *= spec.options.length;
  });

  if (combinations > MAX_COMBINATIONS) {
    ctx.addIssue({
      code: "custom",
      message: `These options make ${combinations} combinations. The limit is ${MAX_COMBINATIONS}. Remove some options.`,
      path: ["variants"],
    });
  }

  if (data.specs.length === 0 && data.variants.length > 0) {
    ctx.addIssue({ code: "custom", message: "Combinations were sent without any specifications", path: ["variants"] });
  }

  data.variants.forEach((variant, vi) => {
    const seen = new Set<number>();
    for (const id of variant.option_client_ids) {
      const specIndex = optionToSpec.get(id);
      if (specIndex === undefined || seen.has(specIndex)) {
        ctx.addIssue({ code: "custom", message: "A combination is invalid. Please reload and try again.", path: ["variants", vi] });
        return;
      }
      seen.add(specIndex);
    }
    if (seen.size !== data.specs.length) {
      ctx.addIssue({ code: "custom", message: "A combination is missing an option. Please reload and try again.", path: ["variants", vi] });
    }
  });
});

export type ProductInput = z.infer<typeof productSchema>;

/** A readable one-line message for the admin form */
export function firstIssueMessage(error: z.ZodError): string {
  return error.issues[0]?.message ?? "Please check the form and try again";
}

export const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
export const MAX_IMAGE_SIZE_BYTES = 8 * 1024 * 1024;
