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
type SpecState = { client_id: string; name: string; affects_price: boolean; options: OptionState[] };
type Rule = { id: string; picks: Record<string, string> };
type Override = { price?: string; available?: boolean };
type Combo = { key: string; optionIds: string[]; label: string };

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
    affects_price: boolean | null;
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
const PRICE_BY_DEFAULT = ["size", "storage", "condition"];

const bySort = (a: { sort_order: number }, b: { sort_order: number }) => a.sort_order - b.sort_order;

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

/** Every way of picking one option from each specification */
function buildCombos(specs: SpecState[]): { combos: Combo[]; total: number } {
  const usable = specs.filter((s) => s.options.length > 0);
  if (usable.length === 0) return { combos: [], total: 0 };

  const total = usable.reduce((n, s) => n * s.options.length, 1);
  if (total > MAX_COMBINATIONS) return { combos: [], total };

  let acc: { ids: string[]; names: string[] }[] = [{ ids: [], names: [] }];
  for (const spec of usable) {
    const next: typeof acc = [];
    for (const c of acc) {
      for (const o of spec.options) {
        next.push({ ids: [...c.ids, o.client_id], names: [...c.names, o.name.trim() || "—"] });
      }
    }
    acc = next;
  }

  return {
    combos: acc.map((c) => ({ key: c.ids.join("|"), optionIds: c.ids, label: c.names.join(" · ") })),
    total,
  };
}

function ruleMatches(rule: Rule, optionIds: string[]) {
  const picks = Object.values(rule.picks).filter(Boolean);
  return picks.length > 0 && picks.every((id) => optionIds.includes(id));
}

/** Turns the combinations an older product marked unavailable into short rules */
function deriveRules(specs: SpecState[], combos: Combo[], unavailable: Set<string>): Rule[] {
  if (unavailable.size === 0) return [];

  const rules: Rule[] = [];
  const covered = new Set<string>();

  // If every combination containing an option is unavailable, one rule covers them all
  for (const spec of specs) {
    for (const option of spec.options) {
      const containing = combos.filter((c) => c.optionIds.includes(option.client_id));
      if (containing.length > 0 && containing.every((c) => unavailable.has(c.key))) {
        rules.push({ id: makeClientId(), picks: { [spec.client_id]: option.client_id } });
        containing.forEach((c) => covered.add(c.key));
      }
    }
  }

  // Anything left gets its own rule
  for (const combo of combos) {
    if (!unavailable.has(combo.key) || covered.has(combo.key)) continue;
    const picks: Record<string, string> = {};
    for (const spec of specs) {
      const hit = spec.options.find((o) => combo.optionIds.includes(o.client_id));
      if (hit) picks[spec.client_id] = hit.client_id;
    }
    rules.push({ id: makeClientId(), picks });
  }

  return rules;
}

type Loaded = {
  specs: SpecState[];
  groupPrices: Record<string, string>;
  overrides: Record<string, Override>;
  rules: Rule[];
};

/** Turns a saved product into the simple editor state: price per option, rules, and any one-off changes */
function loadFromProduct(product?: ExistingProduct): Loaded {
  const rawSpecs = [...(product?.product_specs ?? [])].sort(bySort);
  let specs: SpecState[] = rawSpecs.map((s) => ({
    client_id: s.id,
    name: s.name,
    affects_price: s.affects_price === true,
    options: [...s.product_spec_options].sort(bySort).map((o) => ({
      client_id: o.id,
      name: o.name,
      image_url: o.image_url ?? "",
    })),
  }));

  if (!product || specs.length === 0) return { specs, groupPrices: {}, overrides: {}, rules: [] };

  const base = Number(product.price);
  const specIndexOfOption = new Map<string, number>();
  specs.forEach((s, si) => s.options.forEach((o) => specIndexOfOption.set(o.client_id, si)));

  const variants: { key: string; ids: string[]; price: number; available: boolean }[] = [];
  for (const v of product.product_variants ?? []) {
    const ids = v.product_variant_options
      .map((o) => o.option_id)
      .filter((id) => specIndexOfOption.has(id))
      .sort((a, b) => (specIndexOfOption.get(a) ?? 0) - (specIndexOfOption.get(b) ?? 0));
    if (ids.length !== specs.length) continue;
    variants.push({ key: ids.join("|"), ids, price: v.price ?? base, available: v.is_available });
  }

  // Older products have no saved flags: find the specifications that really change the price
  const flagsSaved = rawSpecs.every((s) => s.affects_price !== null && s.affects_price !== undefined);
  if (!flagsSaved) {
    const live = variants.filter((v) => v.available);
    const affects = specs.map((_spec, i) => {
      const seen = new Map<string, number>();
      for (const v of live) {
        const others = v.ids.filter((_id, j) => j !== i).join("|");
        const prev = seen.get(others);
        if (prev === undefined) seen.set(others, v.price);
        else if (prev !== v.price) return true;
      }
      return false;
    });

    // Same price everywhere, but not the base price: keep it visible on the first specification
    if (
      !affects.some(Boolean) &&
      live.length > 0 &&
      live.every((v) => v.price === live[0].price) &&
      live[0].price !== base
    ) {
      affects[0] = true;
    }

    specs = specs.map((s, i) => ({ ...s, affects_price: affects[i] }));
  }

  const priceIdx = specs.map((s, i) => (s.affects_price ? i : -1)).filter((i) => i >= 0);
  const groupKeyOf = (ids: string[]) => priceIdx.map((i) => ids[i]).join("|");

  // One price per option of the price-driving specifications (the most common price wins)
  const groupPrices: Record<string, string> = {};
  const groupEffective = new Map<string, number>();
  if (priceIdx.length > 0) {
    const tally = new Map<string, Map<number, number>>();
    for (const v of variants) {
      if (!v.available) continue;
      const gk = groupKeyOf(v.ids);
      const counts = tally.get(gk) ?? new Map<number, number>();
      counts.set(v.price, (counts.get(v.price) ?? 0) + 1);
      tally.set(gk, counts);
    }
    tally.forEach((counts, gk) => {
      let best = base;
      let bestCount = -1;
      counts.forEach((count, price) => {
        if (count > bestCount) {
          best = price;
          bestCount = count;
        }
      });
      groupEffective.set(gk, best);
      if (best !== base) groupPrices[gk] = String(best);
    });
  }

  // Anything that doesn't follow its group's price is kept as a one-off change
  const overrides: Record<string, Override> = {};
  for (const v of variants) {
    if (!v.available) continue;
    const expected = priceIdx.length > 0 ? groupEffective.get(groupKeyOf(v.ids)) ?? base : base;
    if (v.price !== expected) overrides[v.key] = { price: String(v.price) };
  }

  const { combos } = buildCombos(specs);
  const comboKeys = new Set(combos.map((c) => c.key));
  const unavailable = new Set(variants.filter((v) => !v.available && comboKeys.has(v.key)).map((v) => v.key));

  return { specs, groupPrices, overrides, rules: deriveRules(specs, combos, unavailable) };
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

  const [initial] = useState(() => loadFromProduct(existingProduct));

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

  const [specs, setSpecs] = useState<SpecState[]>(initial.specs);
  const [groupPrices, setGroupPrices] = useState<Record<string, string>>(initial.groupPrices);
  const [overrides, setOverrides] = useState<Record<string, Override>>(initial.overrides);
  const [rules, setRules] = useState<Rule[]>(initial.rules);
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [bulkPrice, setBulkPrice] = useState("");

  const [uploadingProductImages, setUploadingProductImages] = useState(false);
  const [uploadingOptionId, setUploadingOptionId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ---- Derived data ----
  const { combos, total } = useMemo(() => buildCombos(specs), [specs]);

  const priceSpecs = useMemo(() => specs.filter((s) => s.affects_price && s.options.length > 0), [specs]);
  const { combos: groups, total: groupTotal } = useMemo(() => buildCombos(priceSpecs), [priceSpecs]);

  const rows = useMemo(() => {
    const priceSpecIds = new Set(priceSpecs.map((s) => s.client_id));
    const specOfOption = new Map<string, string>();
    specs.forEach((s) => s.options.forEach((o) => specOfOption.set(o.client_id, s.client_id)));
    const groupKeyOf = (ids: string[]) =>
      ids.filter((id) => priceSpecIds.has(specOfOption.get(id) ?? "")).join("|");
    const activeRules = rules.filter((r) => Object.values(r.picks).some(Boolean));

    return combos.map((combo) => {
      const groupPrice = priceSpecIds.size > 0 ? groupPrices[groupKeyOf(combo.optionIds)] ?? "" : "";
      const ov = overrides[combo.key];
      const priceStr = ov?.price !== undefined ? ov.price : groupPrice;
      const ruleAvailable = !activeRules.some((r) => ruleMatches(r, combo.optionIds));
      const available = ov?.available !== undefined ? ov.available : ruleAvailable;
      return { combo, groupPrice, priceStr, ruleAvailable, available };
    });
  }, [combos, specs, priceSpecs, groupPrices, overrides, rules]);

  const rowByKey = useMemo(() => new Map(rows.map((r) => [r.combo.key, r])), [rows]);
  const unavailableCount = rows.filter((r) => !r.available).length;
  const changedCount = rows.filter((r) => overrides[r.combo.key]).length;

  const activeFilter = (spec: SpecState) =>
    spec.options.some((o) => o.client_id === filters[spec.client_id]) ? filters[spec.client_id] : "";
  const visibleRows = rows.filter((r) =>
    specs.every((s) => {
      const f = activeFilter(s);
      return !f || r.combo.optionIds.includes(f);
    })
  );

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
    setSpecs((prev) => [
      ...prev,
      {
        client_id: makeClientId(),
        name: specName,
        affects_price: PRICE_BY_DEFAULT.includes(specName.trim().toLowerCase()),
        options: [],
      },
    ]);
  }

  function updateSpecName(specId: string, value: string) {
    setSpecs((prev) => prev.map((s) => (s.client_id === specId ? { ...s, name: value } : s)));
  }

  function toggleAffectsPrice(specId: string, checked: boolean) {
    const hasPrices =
      Object.values(groupPrices).some(Boolean) || Object.values(overrides).some((o) => o.price !== undefined);
    if (
      hasPrices &&
      !confirm("Changing which specifications affect the price clears the prices you've entered below. Continue?")
    ) {
      return;
    }

    setSpecs((prev) => prev.map((s) => (s.client_id === specId ? { ...s, affects_price: checked } : s)));
    setGroupPrices({});
    setOverrides((prev) => {
      const next: Record<string, Override> = {};
      for (const [key, o] of Object.entries(prev)) {
        if (o.available !== undefined) next[key] = { available: o.available };
      }
      return next;
    });
  }

  function removeSpec(specId: string) {
    setSpecs((prev) => prev.filter((s) => s.client_id !== specId));
    setRules((prev) => prev.filter((r) => !r.picks[specId]));
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
    setRules((prev) => prev.filter((r) => !Object.values(r.picks).includes(optionId)));
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

  // ---- Prices ----
  function setGroupPrice(key: string, value: string) {
    setGroupPrices((prev) => {
      const next = { ...prev };
      if (value === "") delete next[key];
      else next[key] = value;
      return next;
    });
  }

  function applyPriceToAll() {
    if (!bulkPrice || Number(bulkPrice) <= 0) {
      showError("Enter a price greater than 0 to apply");
      return;
    }
    setError(null);
    const next: Record<string, string> = {};
    groups.forEach((g) => {
      next[g.key] = bulkPrice;
    });
    setGroupPrices(next);
  }

  // ---- Rules ----
  function addRule() {
    setRules((prev) => [...prev, { id: makeClientId(), picks: {} }]);
  }

  function updateRule(ruleId: string, specId: string, optionId: string) {
    setRules((prev) =>
      prev.map((r) => (r.id === ruleId ? { ...r, picks: { ...r.picks, [specId]: optionId } } : r))
    );
  }

  function removeRule(ruleId: string) {
    setRules((prev) => prev.filter((r) => r.id !== ruleId));
  }

  // ---- One-off changes (advanced) ----
  function setOverridePrice(key: string, value: string) {
    setOverrides((prev) => {
      const current: Override = { ...(prev[key] ?? {}) };
      if (value === "") delete current.price;
      else current.price = value;
      const next = { ...prev };
      if (current.price === undefined && current.available === undefined) delete next[key];
      else next[key] = current;
      return next;
    });
  }

  function setOverrideAvailable(key: string, checked: boolean, ruleAvailable: boolean) {
    setOverrides((prev) => {
      const current: Override = { ...(prev[key] ?? {}) };
      if (checked === ruleAvailable) delete current.available;
      else current.available = checked;
      const next = { ...prev };
      if (current.price === undefined && current.available === undefined) delete next[key];
      else next[key] = current;
      return next;
    });
  }

  function clearOverrides() {
    setOverrides({});
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
    if (rows.some((r) => r.priceStr !== "" && !(Number(r.priceStr) > 0))) {
      return fail("Prices must be greater than 0");
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
        affects_price: s.affects_price,
        options: s.options.map((o) => ({
          client_id: o.client_id,
          name: o.name.trim(),
          image_url: o.image_url || null,
        })),
      })),
      variants: rows.map((r) => ({
        option_client_ids: r.combo.optionIds,
        price: r.priceStr ? Number(r.priceStr) : null,
        is_available: r.available,
      })),
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
  const specsWithOptions = specs.filter((s) => s.options.length > 0);
  const priceSpecNames = priceSpecs.map((s) => s.name.trim() || "an unnamed specification").join(" and ");
  const basePriceLabel = price ? ` (GH₵${price})` : "";

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
          <p className="text-xs text-navy-400 mt-1">Used for anything that has no price of its own.</p>
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
          Things the buyer must choose before ordering, like Color, Size, Storage or Condition. Any option can
          have a photo. Tick &ldquo;Price changes with this&rdquo; on the ones that change the price.
        </p>

        <div className="space-y-4">
          {specs.map((spec) => (
            <div key={spec.client_id} className="border border-navy-100 rounded p-3 bg-navy-50/30">
              <div className="flex items-center gap-2 mb-2">
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

              <label className="flex items-start gap-2 text-xs text-navy-600 mb-3 cursor-pointer">
                <input
                  type="checkbox"
                  className="mt-0.5"
                  checked={spec.affects_price}
                  onChange={(e) => toggleAffectsPrice(spec.client_id, e.target.checked)}
                />
                <span>
                  Price changes with this{" "}
                  <span className="text-navy-400">(like Size or Storage. Leave unticked for things like Color)</span>
                </span>
              </label>

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

      {/* Prices, rules, and one-off changes */}
      {specs.length > 0 && specsWithOptions.length > 0 && (
        <div className="border border-navy-100 rounded p-4 space-y-8">
          {total > MAX_COMBINATIONS ? (
            <p className="text-sm text-red-600 bg-red-50 rounded p-3">
              These options make {total} combinations. The limit is {MAX_COMBINATIONS}. Remove some options.
            </p>
          ) : (
            <>
              <p className="text-xs text-navy-400">
                {total} combination{total === 1 ? "" : "s"} in total
                {unavailableCount > 0 ? ` · ${unavailableCount} not available` : ""}. Buyers pick one option from
                each specification.
              </p>

              {/* Prices */}
              <div>
                <p className="text-sm font-medium text-navy-700">Prices</p>

                {priceSpecs.length === 0 ? (
                  <p className="text-xs text-navy-400 mt-1">
                    Every combination uses the base price{basePriceLabel}. If some options cost more or less, tick
                    &ldquo;Price changes with this&rdquo; on that specification above (for example Size or Storage)
                    and you can set a price for each of its options here.
                  </p>
                ) : (
                  <>
                    <p className="text-xs text-navy-400 mt-1 mb-3">
                      Price changes with {priceSpecNames}. Set {groups.length} price{groups.length === 1 ? "" : "s"}{" "}
                      below and they apply to all {total} combinations. Leave one empty to use the base price
                      {basePriceLabel}.
                    </p>

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
                        onClick={applyPriceToAll}
                        className="text-xs bg-navy-800 text-white rounded px-3 py-1.5 hover:bg-navy-700"
                      >
                        Set all {groups.length} to this
                      </button>
                      <button
                        type="button"
                        onClick={() => setGroupPrices({})}
                        className="text-xs border border-navy-200 rounded px-3 py-1.5 text-navy-600 hover:bg-navy-50"
                      >
                        Use base price for all
                      </button>
                    </div>

                    <div className="overflow-auto max-h-80 border border-navy-100 rounded">
                      <table className="w-full text-sm min-w-[300px]">
                        <thead className="bg-navy-50 text-navy-500 text-left sticky top-0">
                          <tr>
                            <th className="px-3 py-2 font-medium">{priceSpecNames}</th>
                            <th className="px-3 py-2 font-medium">Price (GH₵)</th>
                          </tr>
                        </thead>
                        <tbody>
                          {groups.map((g) => (
                            <tr key={g.key} className="border-t border-navy-50">
                              <td className="px-3 py-2 text-navy-800">{g.label}</td>
                              <td className="px-3 py-2">
                                <input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  placeholder={price ? `Base ${price}` : "Base price"}
                                  value={groupPrices[g.key] ?? ""}
                                  onChange={(e) => setGroupPrice(g.key, e.target.value)}
                                  className="w-32 border border-navy-100 rounded px-2 py-1.5 text-sm"
                                />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
              </div>

              {/* Rules */}
              <div>
                <p className="text-sm font-medium text-navy-700">Combinations that don&apos;t exist</p>
                <p className="text-xs text-navy-400 mt-1 mb-3">
                  Everything is available by default. Add a rule for anything that isn&apos;t, like Red in size 44.
                  Choose the options it covers and leave the rest on &ldquo;Any&rdquo;.
                </p>

                <div className="space-y-2">
                  {rules.map((rule) => {
                    const active = Object.values(rule.picks).some(Boolean);
                    const matches = active ? combos.filter((c) => ruleMatches(rule, c.optionIds)).length : 0;
                    return (
                      <div
                        key={rule.id}
                        className="flex flex-wrap items-center gap-2 border border-navy-100 rounded p-2 bg-navy-50/30"
                      >
                        <span className="text-xs text-navy-500">Not available:</span>
                        {specsWithOptions.map((spec) => (
                          <select
                            key={spec.client_id}
                            value={rule.picks[spec.client_id] ?? ""}
                            onChange={(e) => updateRule(rule.id, spec.client_id, e.target.value)}
                            className="border border-navy-100 rounded px-2 py-1.5 text-xs bg-white"
                          >
                            <option value="">Any {spec.name.trim() || "option"}</option>
                            {spec.options.map((o) => (
                              <option key={o.client_id} value={o.client_id}>
                                {o.name.trim() || "—"}
                              </option>
                            ))}
                          </select>
                        ))}
                        <span className="text-xs text-navy-400">
                          {active ? `${matches} combination${matches === 1 ? "" : "s"}` : "Choose at least one option"}
                        </span>
                        <button
                          type="button"
                          onClick={() => removeRule(rule.id)}
                          className="ml-auto text-red-500"
                          aria-label="Remove rule"
                        >
                          <HiOutlineTrash className="w-4 h-4" />
                        </button>
                      </div>
                    );
                  })}
                  {rules.length === 0 && <p className="text-xs text-navy-400">No rules. Everything is available.</p>}
                </div>

                <button
                  type="button"
                  onClick={addRule}
                  className="mt-3 flex items-center gap-1 text-sm text-ocean hover:underline"
                >
                  <HiOutlinePlus className="w-4 h-4" /> Add rule
                </button>
              </div>

              {/* Advanced */}
              <details className="border border-navy-100 rounded">
                <summary className="cursor-pointer px-3 py-2 text-sm font-medium text-navy-700">
                  Advanced: change a single combination
                  {changedCount > 0 && (
                    <span className="ml-2 text-xs font-normal text-amber-700">{changedCount} changed</span>
                  )}
                </summary>
                <div className="p-3 border-t border-navy-100">
                  <p className="text-xs text-navy-400 mb-3">
                    Only for one-offs, like a single color and size that costs more. The price and availability here
                    win over the prices and rules above.
                  </p>

                  <div className="flex flex-wrap items-center gap-2 mb-3">
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
                    {changedCount > 0 && (
                      <button
                        type="button"
                        onClick={clearOverrides}
                        className="text-xs border border-navy-200 rounded px-3 py-1.5 text-navy-600 hover:bg-navy-50"
                      >
                        Clear all {changedCount} changes
                      </button>
                    )}
                  </div>

                  <p className="text-xs text-navy-400 mb-2">
                    Showing {visibleRows.length} of {rows.length} combinations
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
                        {visibleRows.map((r) => {
                          const ov = overrides[r.combo.key];
                          const row = rowByKey.get(r.combo.key) ?? r;
                          return (
                            <tr
                              key={r.combo.key}
                              className={`border-t border-navy-50 ${row.available ? "" : "opacity-50"}`}
                            >
                              <td className="px-3 py-2 text-navy-800">
                                {r.combo.label}
                                {ov && (
                                  <span className="ml-2 text-[10px] text-amber-700 bg-amber-50 rounded px-1.5 py-0.5">
                                    changed
                                  </span>
                                )}
                              </td>
                              <td className="px-3 py-2">
                                <input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  placeholder={row.groupPrice || price || "Base"}
                                  value={ov?.price ?? ""}
                                  onChange={(e) => setOverridePrice(r.combo.key, e.target.value)}
                                  className="w-28 border border-navy-100 rounded px-2 py-1.5 text-sm"
                                />
                              </td>
                              <td className="px-3 py-2 text-center">
                                <input
                                  type="checkbox"
                                  checked={row.available}
                                  onChange={(e) =>
                                    setOverrideAvailable(r.combo.key, e.target.checked, row.ruleAvailable)
                                  }
                                  aria-label={`${r.combo.label} available`}
                                />
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </details>
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
