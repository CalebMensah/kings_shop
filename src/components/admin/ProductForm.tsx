"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  HiOutlineUpload,
  HiOutlineX,
  HiOutlinePlus,
  HiOutlineTrash,
  HiOutlinePhotograph,
} from "react-icons/hi";
import { MAX_COMBINATIONS, MAX_OPTIONS_PER_SPEC, MAX_SPECS } from "@/lib/validation/product";

type Category = { id: string; name: string };
type OptionState = { client_id: string; name: string; image_url: string };
type SpecState = { client_id: string; name: string; options: OptionState[] };
type RowState = { price: string; available: boolean };

type ExistingProduct = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  category_id: string;
  moq: number;
  preorder_fulfillment_note: string | null;
  status: "active" | "draft" | "archived";
  product_images?: { image_url: string; sort_order: number }[];
  product_specs?: {
    id: string;
    name: string;
    sort_order: number;
    product_spec_options: { id: string; name: string; image_url: string | null; sort_order: number }[];
  }[];
  product_variants?: {
    id: string;
    price: number | null;
    is_available: boolean;
    product_variant_options: { option_id: string }[];
  }[];
};

const PRESET_SPECS = ["Color", "Size", "Storage", "Condition"];
const bySort = (a: { sort_order: number }, b: { sort_order: number }) => a.sort_order - b.sort_order;
const emptyRow = (): RowState => ({ price: "", available: true });

function makeClientId() {
  return typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2);
}

async function uploadImage(file: File): Promise<string | null> {
  const formData = new FormData();
  formData.append("file", file);
  const res = await fetch("/api/admin/upload", { method: "POST", body: formData });
  const data = await res.json();
  return res.ok ? data.url : null;
}

function initialSpecs(product?: ExistingProduct): SpecState[] {
  return [...(product?.product_specs ?? [])].sort(bySort).map((s) => ({
    client_id: s.id,
    name: s.name,
    options: [...s.product_spec_options].sort(bySort).map((o) => ({
      client_id: o.id,
      name: o.name,
      image_url: o.image_url ?? "",
    })),
  }));
}

function initialRows(product: ExistingProduct | undefined, specs: SpecState[]): Record<string, RowState> {
  const specIndexOfOption = new Map<string, number>();
  specs.forEach((s, si) => s.options.forEach((o) => specIndexOfOption.set(o.client_id, si)));

  const rows: Record<string, RowState> = {};
  for (const v of product?.product_variants ?? []) {
    const ids = v.product_variant_options
      .map((o) => o.option_id)
      .sort((a, b) => (specIndexOfOption.get(a) ?? 0) - (specIndexOfOption.get(b) ?? 0));
    rows[ids.join("|")] = {
      price: v.price != null ? String(v.price) : "",
      available: v.is_available,
    };
  }
  return rows;
}

/** Every combination of one option from each specification */
function buildCombos(specs: SpecState[]) {
  const usable = specs.filter((s) => s.options.length > 0);
  if (usable.length === 0) return { combos: [] as { key: string; optionIds: string[]; label: string }[], total: 0 };

  const total = usable.reduce((n, s) => n * s.options.length, 1);
  if (total > MAX_COMBINATIONS) return { combos: [], total };

  let combos: { ids: string[]; names: string[] }[] = [{ ids: [], names: [] }];
  for (const spec of usable) {
    const next: typeof combos = [];
    for (const c of combos) {
      for (const o of spec.options) {
        next.push({ ids: [...c.ids, o.client_id], names: [...c.names, o.name.trim() || "—"] });
      }
    }
    combos = next;
  }

  return {
    combos: combos.map((c) => ({ key: c.ids.join("|"), optionIds: c.ids, label: c.names.join(" · ") })),
    total,
  };
}

export function ProductForm({
  categories,
  existingProduct,
}: {
  categories: Category[];
  existingProduct?: ExistingProduct;
}) {
  const router = useRouter();
  const isEditing = !!existingProduct;

  const [name, setName] = useState(existingProduct?.name ?? "");
  const [description, setDescription] = useState(existingProduct?.description ?? "");
  const [price, setPrice] = useState(existingProduct?.price?.toString() ?? "");
  const [categoryId, setCategoryId] = useState(existingProduct?.category_id ?? "");
  const [moq, setMoq] = useState(existingProduct?.moq?.toString() ?? "1");
  const [preorderNote, setPreorderNote] = useState(existingProduct?.preorder_fulfillment_note ?? "");
  const [status, setStatus] = useState(existingProduct?.status ?? "active");

  const [imageUrls, setImageUrls] = useState<string[]>(
    [...(existingProduct?.product_images ?? [])].sort(bySort).map((img) => img.image_url)
  );

  const [specs, setSpecs] = useState<SpecState[]>(() => initialSpecs(existingProduct));
  const [rows, setRows] = useState<Record<string, RowState>>(() =>
    initialRows(existingProduct, initialSpecs(existingProduct))
  );
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [bulkPrice, setBulkPrice] = useState("");

  const [uploadingProductImages, setUploadingProductImages] = useState(false);
  const [uploadingOptionId, setUploadingOptionId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { combos, total } = useMemo(() => buildCombos(specs), [specs]);

  const activeFilter = (spec: SpecState) =>
    spec.options.some((o) => o.client_id === filters[spec.client_id]) ? filters[spec.client_id] : "";

  const visibleCombos = combos.filter((c) =>
    specs.every((s) => {
      const f = activeFilter(s);
      return !f || c.optionIds.includes(f);
    })
  );

  const rowOf = (key: string): RowState => rows[key] ?? emptyRow();

  function showError(message: string) {
    setError(message);
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  }

  // ---- Product images ----
  async function handleProductImageSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;
    setUploadingProductImages(true);
    setError(null);
    for (const file of files) {
      const url = await uploadImage(file);
      if (url) setImageUrls((prev) => [...prev, url]);
      else showError("Image upload failed");
    }
    setUploadingProductImages(false);
    e.target.value = "";
  }

  function removeProductImage(url: string) {
    setImageUrls((prev) => prev.filter((u) => u !== url));
  }

  // ---- Specifications ----
  function addSpec(specName = "") {
    if (specs.length >= MAX_SPECS) return;
    setSpecs((prev) => [...prev, { client_id: makeClientId(), name: specName, options: [] }]);
  }

  function updateSpecName(specId: string, value: string) {
    setSpecs((prev) => prev.map((s) => (s.client_id === specId ? { ...s, name: value } : s)));
  }

  function removeSpec(specId: string) {
    setSpecs((prev) => prev.filter((s) => s.client_id !== specId));
    setFilters((prev) => {
      const next = { ...prev };
      delete next[specId];
      return next;
    });
  }

  function addOption(specId: string) {
    setSpecs((prev) =>
      prev.map((s) =>
        s.client_id === specId && s.options.length < MAX_OPTIONS_PER_SPEC
          ? { ...s, options: [...s.options, { client_id: makeClientId(), name: "", image_url: "" }] }
          : s
      )
    );
  }

  function updateOption(specId: string, optionId: string, patch: Partial<OptionState>) {
    setSpecs((prev) =>
      prev.map((s) =>
        s.client_id === specId
          ? { ...s, options: s.options.map((o) => (o.client_id === optionId ? { ...o, ...patch } : o)) }
          : s
      )
    );
  }

  function removeOption(specId: string, optionId: string) {
    setSpecs((prev) =>
      prev.map((s) =>
        s.client_id === specId ? { ...s, options: s.options.filter((o) => o.client_id !== optionId) } : s
      )
    );
  }

  async function handleOptionImage(specId: string, optionId: string, e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingOptionId(optionId);
    const url = await uploadImage(file);
    setUploadingOptionId(null);
    if (url) updateOption(specId, optionId, { image_url: url });
    else showError("Image upload failed");
    e.target.value = "";
  }

  // ---- Combinations ----
  function updateRow(key: string, patch: Partial<RowState>) {
    setRows((prev) => ({ ...prev, [key]: { ...(prev[key] ?? emptyRow()), ...patch } }));
  }

  function applyToVisible(patch: Partial<RowState>) {
    setRows((prev) => {
      const next = { ...prev };
      for (const c of visibleCombos) next[c.key] = { ...(next[c.key] ?? emptyRow()), ...patch };
      return next;
    });
  }

  function applyBulkPrice() {
    if (!bulkPrice || Number(bulkPrice) <= 0) {
      showError("Enter a price greater than 0 to apply");
      return;
    }
    setError(null);
    applyToVisible({ price: bulkPrice });
  }

  // ---- Save / delete ----
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const fail = (message: string) => {
      showError(message);
      setSubmitting(false);
    };

    if (specs.some((s) => !s.name.trim())) return fail("Every specification needs a name");
    if (specs.some((s) => s.options.length === 0)) return fail("Every specification needs at least one option");
    if (specs.some((s) => s.options.some((o) => !o.name.trim()))) return fail("Every option needs a name");
    if (total > MAX_COMBINATIONS) {
      return fail(`These options make ${total} combinations. The limit is ${MAX_COMBINATIONS}. Remove some options.`);
    }

    const hasOptionPhoto = specs.some((s) => s.options.some((o) => o.image_url));
    if (imageUrls.length === 0 && !hasOptionPhoto) {
      return fail("Add at least one product image, or a photo on one of the options");
    }

    const payload = {
      name,
      description,
      price: Number(price),
      category_id: categoryId,
      moq: Number(moq),
      preorder_fulfillment_note: preorderNote || undefined,
      status,
      images: imageUrls,
      specs: specs.map((s) => ({
        client_id: s.client_id,
        name: s.name.trim(),
        options: s.options.map((o) => ({
          client_id: o.client_id,
          name: o.name.trim(),
          image_url: o.image_url || null,
        })),
      })),
      variants: combos.map((c) => {
        const row = rowOf(c.key);
        return {
          option_client_ids: c.optionIds,
          price: row.price ? Number(row.price) : null,
          is_available: row.available,
        };
      }),
    };

    const url = isEditing ? `/api/admin/products/${existingProduct.id}` : "/api/admin/products";
    const method = isEditing ? "PATCH" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    setSubmitting(false);

    if (!res.ok) {
      const data = await res.json();
      showError(typeof data.error === "string" ? data.error : "Something went wrong. Check the fields and try again.");
      return;
    }

    router.push("/admin/products");
    router.refresh();
  }

  async function handleDelete() {
    if (!existingProduct) return;
    if (!confirm(`Delete "${existingProduct.name}"? It will be removed from the store, but past orders that included it stay intact.`)) {
      return;
    }
    setDeleting(true);
    const res = await fetch(`/api/admin/products/${existingProduct.id}`, { method: "DELETE" });
    setDeleting(false);

    if (res.ok) {
      router.push("/admin/products");
      router.refresh();
    } else {
      showError("Could not delete product. Please try again.");
    }
  }

  const unusedPresets = PRESET_SPECS.filter(
    (p) => !specs.some((s) => s.name.trim().toLowerCase() === p.toLowerCase())
  );

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl w-full space-y-6">
      {error && <p className="text-sm text-red-600 bg-red-50 rounded p-3">{error}</p>}

      <div>
        <label className="block text-sm text-navy-700 mb-1">Product name</label>
        <input
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full border border-navy-100 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-turquoise"
        />
      </div>

      <div>
        <label className="block text-sm text-navy-700 mb-1">Description</label>
        <textarea
          rows={4}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full border border-navy-100 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-turquoise"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm text-navy-700 mb-1">Base price (GH₵)</label>
          <input
            required
            type="number"
            step="0.01"
            min="0"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            className="w-full border border-navy-100 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-turquoise"
          />
          <p className="text-xs text-navy-400 mt-1">
            Used for any combination that has no price of its own.
          </p>
        </div>
        <div>
          <label className="block text-sm text-navy-700 mb-1">Category</label>
          <select
            required
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className="w-full border border-navy-100 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-turquoise"
          >
            <option value="">Select category</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm text-navy-700 mb-1">Minimum order quantity (MOQ)</label>
          <input
            required
            type="number"
            min="1"
            value={moq}
            onChange={(e) => setMoq(e.target.value)}
            className="w-full border border-navy-100 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-turquoise"
          />
        </div>
        <div>
          <label className="block text-sm text-navy-700 mb-1">Status</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as typeof status)}
            className="w-full border border-navy-100 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-turquoise"
          >
            <option value="active">Active</option>
            <option value="draft">Draft</option>
          </select>
        </div>
      </div>

      <div className="border border-turquoise/30 bg-turquoise/5 rounded p-4">
        <p className="text-sm text-navy-700 font-medium mb-1">This product is a preorder item</p>
        <p className="text-xs text-navy-400 mb-3">
          Every product on this store is sourced per order — there&apos;s no separate in-stock option.
        </p>
        <label className="block text-sm text-navy-700 mb-1">Estimated delivery time</label>
        <input
          placeholder="e.g. Ships in 2–3 weeks"
          value={preorderNote}
          onChange={(e) => setPreorderNote(e.target.value)}
          className="w-full border border-navy-100 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-turquoise"
        />
      </div>

      {/* Product images */}
      <div>
        <label className="block text-sm text-navy-700 mb-1">Product images</label>
        <p className="text-xs text-navy-400 mb-2">
          Shown on product cards and as the default photo. Optional if your options have photos.
        </p>
        <div className="flex flex-wrap gap-3 mb-3">
          {imageUrls.map((url) => (
            <div key={url} className="relative w-20 h-20">
              <Image src={url} alt="" fill className="object-cover rounded" sizes="80px" />
              <button
                type="button"
                onClick={() => removeProductImage(url)}
                className="absolute -top-2 -right-2 bg-navy-900 text-white rounded-full w-5 h-5 flex items-center justify-center"
                aria-label="Remove image"
              >
                <HiOutlineX className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
        <label className="inline-flex items-center gap-2 border border-navy-200 border-dashed rounded px-4 py-2.5 text-sm text-navy-600 cursor-pointer hover:border-navy-400">
          <HiOutlineUpload className="w-4 h-4" />
          {uploadingProductImages ? "Uploading..." : "Upload images"}
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            onChange={handleProductImageSelect}
            disabled={uploadingProductImages}
            className="hidden"
          />
        </label>
      </div>

      {/* Specifications */}
      <div className="border border-navy-100 rounded p-4">
        <p className="text-sm font-medium text-navy-700">Specifications (optional)</p>
        <p className="text-xs text-navy-400 mb-4">
          Things the buyer must choose before ordering, like Color, Size, Storage or Condition. Add every
          specification and option first, then set prices below. Any option can have a photo.
        </p>

        <div className="space-y-4">
          {specs.map((spec) => (
            <div key={spec.client_id} className="border border-navy-100 rounded p-3 bg-navy-50/30">
              <div className="flex items-center gap-2 mb-3">
                <input
                  placeholder="Specification name (e.g. Storage)"
                  value={spec.name}
                  onChange={(e) => updateSpecName(spec.client_id, e.target.value)}
                  className="flex-1 border border-navy-100 rounded px-3 py-2 text-sm font-medium bg-white focus:outline-none focus:ring-2 focus:ring-turquoise"
                />
                <button
                  type="button"
                  onClick={() => removeSpec(spec.client_id)}
                  className="text-red-500"
                  aria-label="Remove specification"
                >
                  <HiOutlineTrash className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-2">
                {spec.options.map((opt) => (
                  <div key={opt.client_id} className="flex items-center gap-2">
                    <label
                      title="Optional photo"
                      className="relative w-10 h-10 shrink-0 border border-navy-200 border-dashed rounded flex items-center justify-center cursor-pointer hover:border-navy-400 overflow-hidden bg-white"
                    >
                      {opt.image_url ? (
                        <Image src={opt.image_url} alt="" fill className="object-cover" sizes="40px" />
                      ) : (
                        <HiOutlinePhotograph className="w-4 h-4 text-navy-300" />
                      )}
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        onChange={(e) => handleOptionImage(spec.client_id, opt.client_id, e)}
                        disabled={uploadingOptionId === opt.client_id}
                        className="hidden"
                      />
                    </label>
                    <input
                      placeholder="Option (e.g. 256GB)"
                      value={opt.name}
                      onChange={(e) => updateOption(spec.client_id, opt.client_id, { name: e.target.value })}
                      className="flex-1 border border-navy-100 rounded px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-turquoise"
                    />
                    {uploadingOptionId === opt.client_id && (
                      <span className="text-xs text-navy-400">Uploading...</span>
                    )}
                    {opt.image_url && (
                      <button
                        type="button"
                        onClick={() => updateOption(spec.client_id, opt.client_id, { image_url: "" })}
                        className="text-navy-300 hover:text-navy-600"
                        aria-label="Remove option photo"
                        title="Remove photo"
                      >
                        <HiOutlineX className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => removeOption(spec.client_id, opt.client_id)}
                      className="text-red-500"
                      aria-label="Remove option"
                    >
                      <HiOutlineTrash className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                {spec.options.length === 0 && <p className="text-xs text-navy-400">No options yet.</p>}
              </div>

              <button
                type="button"
                onClick={() => addOption(spec.client_id)}
                disabled={spec.options.length >= MAX_OPTIONS_PER_SPEC}
                className="mt-3 flex items-center gap-1 text-sm text-ocean hover:underline disabled:opacity-40"
              >
                <HiOutlinePlus className="w-4 h-4" /> Add option
              </button>
            </div>
          ))}
        </div>

        {specs.length < MAX_SPECS && (
          <div className="flex flex-wrap items-center gap-2 mt-4">
            <span className="text-xs text-navy-400">Add:</span>
            {unusedPresets.map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => addSpec(preset)}
                className="text-xs border border-navy-200 rounded-full px-3 py-1 text-navy-600 hover:bg-navy-50"
              >
                + {preset}
              </button>
            ))}
            <button
              type="button"
              onClick={() => addSpec("")}
              className="text-xs border border-navy-200 rounded-full px-3 py-1 text-navy-600 hover:bg-navy-50"
            >
              + Custom
            </button>
          </div>
        )}
      </div>

      {/* Prices and availability per combination */}
      {specs.length > 0 && total > 0 && (
        <div className="border border-navy-100 rounded p-4">
          <p className="text-sm font-medium text-navy-700">Prices and availability</p>
          <p className="text-xs text-navy-400 mb-3">
            Each row is one thing a buyer can order. Leave a price empty to use the base price
            {price ? ` (GH₵${price})` : ""}. Untick a row if that combination doesn&apos;t exist.
          </p>

          {total > MAX_COMBINATIONS ? (
            <p className="text-sm text-red-600 bg-red-50 rounded p-3">
              These options make {total} combinations. The limit is {MAX_COMBINATIONS}. Remove some options.
            </p>
          ) : (
            <>
              {specs.some((s) => s.options.length > 1) && (
                <div className="flex flex-wrap gap-2 mb-3">
                  {specs
                    .filter((s) => s.options.length > 1)
                    .map((s) => (
                      <select
                        key={s.client_id}
                        value={activeFilter(s)}
                        onChange={(e) => setFilters((prev) => ({ ...prev, [s.client_id]: e.target.value }))}
                        className="border border-navy-100 rounded px-2 py-1.5 text-xs bg-white"
                      >
                        <option value="">All {s.name.trim() || "options"}</option>
                        {s.options.map((o) => (
                          <option key={o.client_id} value={o.client_id}>
                            {o.name.trim() || "—"}
                          </option>
                        ))}
                      </select>
                    ))}
                </div>
              )}

              <div className="flex flex-wrap items-center gap-2 mb-3">
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="Price"
                  value={bulkPrice}
                  onChange={(e) => setBulkPrice(e.target.value)}
                  className="w-28 border border-navy-100 rounded px-2 py-1.5 text-xs"
                />
                <button
                  type="button"
                  onClick={applyBulkPrice}
                  className="text-xs bg-navy-800 text-white rounded px-3 py-1.5 hover:bg-navy-700"
                >
                  Set price for the {visibleCombos.length} shown
                </button>
                <button
                  type="button"
                  onClick={() => applyToVisible({ price: "" })}
                  className="text-xs border border-navy-200 rounded px-3 py-1.5 text-navy-600 hover:bg-navy-50"
                >
                  Use base price
                </button>
                <button
                  type="button"
                  onClick={() => applyToVisible({ available: false })}
                  className="text-xs border border-navy-200 rounded px-3 py-1.5 text-navy-600 hover:bg-navy-50"
                >
                  Mark unavailable
                </button>
                <button
                  type="button"
                  onClick={() => applyToVisible({ available: true })}
                  className="text-xs border border-navy-200 rounded px-3 py-1.5 text-navy-600 hover:bg-navy-50"
                >
                  Mark available
                </button>
              </div>

              <p className="text-xs text-navy-400 mb-2">
                Showing {visibleCombos.length} of {combos.length} combinations
              </p>

              <div className="overflow-auto max-h-96 border border-navy-100 rounded">
                <table className="w-full text-sm min-w-[360px]">
                  <thead className="bg-navy-50 text-navy-500 text-left sticky top-0">
                    <tr>
                      <th className="px-3 py-2 font-medium">Combination</th>
                      <th className="px-3 py-2 font-medium">Price (GH₵)</th>
                      <th className="px-3 py-2 font-medium text-center">Available</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleCombos.map((c) => {
                      const row = rowOf(c.key);
                      return (
                        <tr key={c.key} className={`border-t border-navy-50 ${row.available ? "" : "opacity-50"}`}>
                          <td className="px-3 py-2 text-navy-800">{c.label}</td>
                          <td className="px-3 py-2">
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              placeholder={price ? `Base ${price}` : "Base price"}
                              value={row.price}
                              onChange={(e) => updateRow(c.key, { price: e.target.value })}
                              className="w-32 border border-navy-100 rounded px-2 py-1.5 text-sm"
                            />
                          </td>
                          <td className="px-3 py-2 text-center">
                            <input
                              type="checkbox"
                              checked={row.available}
                              onChange={(e) => updateRow(c.key, { available: e.target.checked })}
                              aria-label={`${c.label} available`}
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={submitting || uploadingProductImages || uploadingOptionId !== null}
          className="bg-navy-800 text-white px-5 py-2.5 rounded text-sm font-medium hover:bg-navy-700 transition disabled:opacity-50"
        >
          {submitting ? "Saving..." : isEditing ? "Save changes" : "Add product"}
        </button>
        {isEditing && (
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting}
            className="flex items-center gap-1.5 text-sm text-red-500 hover:text-red-600 disabled:opacity-50"
          >
            <HiOutlineTrash className="w-4 h-4" />
            {deleting ? "Deleting..." : "Delete product"}
          </button>
        )}
      </div>
    </form>
  );
}
