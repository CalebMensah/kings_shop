"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  HiOutlinePlus,
  HiOutlinePencil,
  HiOutlineTrash,
  HiOutlineCheck,
  HiOutlineX,
  HiOutlineUpload,
  HiOutlinePhotograph,
} from "react-icons/hi";

type Category = {
  id: string;
  name: string;
  slug: string;
  image_url: string | null;
  parent_id: string | null;
  sort_order: number;
  products: { count: number }[];
};

async function uploadImage(file: File): Promise<string | null> {
  const formData = new FormData();
  formData.append("file", file);
  const res = await fetch("/api/admin/upload", { method: "POST", body: formData });
  const data = await res.json();
  return res.ok ? data.url : null;
}

export function CategoryManager({ categories }: { categories: Category[] }) {
  const router = useRouter();
  const mains = categories.filter((c) => !c.parent_id);
  const subsOf = (id: string) => categories.filter((c) => c.parent_id === id);

  const [newName, setNewName] = useState("");
  const [newParentId, setNewParentId] = useState("");
  const [newImageUrl, setNewImageUrl] = useState<string | null>(null);
  const [uploadingNew, setUploadingNew] = useState(false);
  const [adding, setAdding] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editImageUrl, setEditImageUrl] = useState<string | null>(null);
  const [uploadingEdit, setUploadingEdit] = useState(false);

  const [error, setError] = useState<string | null>(null);

  async function handleNewImageSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingNew(true);
    const url = await uploadImage(file);
    setUploadingNew(false);
    if (url) setNewImageUrl(url);
    else setError("Image upload failed");
    e.target.value = "";
  }

  async function handleEditImageSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingEdit(true);
    const url = await uploadImage(file);
    setUploadingEdit(false);
    if (url) setEditImageUrl(url);
    else setError("Image upload failed");
    e.target.value = "";
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    setAdding(true);
    setError(null);

    const res = await fetch("/api/admin/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: newName,
        image_url: newImageUrl ?? undefined,
        parent_id: newParentId || undefined,
      }),
    });
    const data = await res.json();
    setAdding(false);

    if (!res.ok) {
      setError(typeof data.error === "string" ? data.error : "Could not add category");
      return;
    }

    setNewName("");
    setNewImageUrl(null);
    router.refresh();
  }

  async function handleEditSave(id: string) {
    if (!editName.trim()) return;
    setError(null);
    const res = await fetch(`/api/admin/categories/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: editName, image_url: editImageUrl }),
    });
    if (res.ok) {
      setEditingId(null);
      router.refresh();
    } else {
      setError("Could not save changes");
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this category?")) return;
    setError(null);
    const res = await fetch(`/api/admin/categories/${id}`, { method: "DELETE" });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Could not delete category");
      return;
    }
    router.refresh();
  }

  function renderRow(cat: Category, isSub: boolean) {
    const subs = subsOf(cat.id);
    const productCount = cat.products?.[0]?.count ?? 0;
    const meta =
      isSub || subs.length === 0
        ? `${productCount} product${productCount === 1 ? "" : "s"}`
        : `${subs.length} subcategor${subs.length === 1 ? "y" : "ies"}`;
    const isEditing = editingId === cat.id;

    return (
      <div
        key={cat.id}
        className={`flex items-center gap-3 px-4 py-3 ${isSub ? "pl-10 border-t border-navy-50 bg-navy-50/30" : ""}`}
      >
        {isEditing ? (
          <>
            <label className="relative w-12 h-12 shrink-0 border border-navy-200 border-dashed rounded flex items-center justify-center cursor-pointer overflow-hidden">
              {editImageUrl ? (
                <Image src={editImageUrl} alt="" fill className="object-cover" sizes="48px" />
              ) : (
                <HiOutlineUpload className="w-4 h-4 text-navy-300" />
              )}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleEditImageSelect}
                disabled={uploadingEdit}
                className="hidden"
              />
            </label>
            <input
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              autoFocus
              className="flex-1 border border-navy-200 rounded px-2 py-1 text-sm"
            />
            <button onClick={() => handleEditSave(cat.id)} className="text-turquoise-dark" aria-label="Save">
              <HiOutlineCheck className="w-4 h-4" />
            </button>
            <button onClick={() => setEditingId(null)} className="text-navy-400" aria-label="Cancel">
              <HiOutlineX className="w-4 h-4" />
            </button>
          </>
        ) : (
          <>
            <div className="relative w-12 h-12 shrink-0 rounded bg-navy-50 overflow-hidden">
              {cat.image_url && <Image src={cat.image_url} alt="" fill className="object-cover" sizes="48px" />}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-navy-900 truncate">{cat.name}</p>
              <p className="text-xs text-navy-400">{meta}</p>
            </div>
            <button
              onClick={() => {
                setEditingId(cat.id);
                setEditName(cat.name);
                setEditImageUrl(cat.image_url);
              }}
              className="text-navy-300 hover:text-navy-600"
              aria-label="Edit"
            >
              <HiOutlinePencil className="w-4 h-4" />
            </button>
            <button onClick={() => handleDelete(cat.id)} className="text-navy-300 hover:text-red-500" aria-label="Delete">
              <HiOutlineTrash className="w-4 h-4" />
            </button>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="max-w-2xl">
      {error && <p className="text-sm text-red-600 bg-red-50 rounded p-3 mb-4">{error}</p>}

      {/* Add category or subcategory */}
      <form onSubmit={handleAdd} className="border border-navy-100 rounded p-4 mb-6 space-y-3 bg-white">
        <div className="flex gap-3 items-start">
          <label className="relative w-16 h-16 shrink-0 border border-navy-200 border-dashed rounded flex items-center justify-center cursor-pointer hover:border-navy-400 overflow-hidden">
            {newImageUrl ? (
              <Image src={newImageUrl} alt="" fill className="object-cover" sizes="64px" />
            ) : (
              <HiOutlinePhotograph className="w-6 h-6 text-navy-300" />
            )}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleNewImageSelect}
              disabled={uploadingNew}
              className="hidden"
            />
          </label>
          <div className="flex-1 space-y-2">
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Category name"
              className="w-full border border-navy-100 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-turquoise"
            />
            <select
              value={newParentId}
              onChange={(e) => setNewParentId(e.target.value)}
              className="w-full border border-navy-100 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-turquoise"
            >
              <option value="">Main category (no parent)</option>
              {mains.map((m) => (
                <option key={m.id} value={m.id}>Subcategory of {m.name}</option>
              ))}
            </select>
            <p className="text-xs text-navy-400">
              {uploadingNew ? "Uploading image..." : "Click the square to add an image"}
            </p>
          </div>
        </div>
        <button
          type="submit"
          disabled={adding || uploadingNew}
          className="flex items-center gap-1.5 bg-navy-800 text-white text-sm px-4 py-2 rounded hover:bg-navy-700 transition disabled:opacity-50"
        >
          <HiOutlinePlus className="w-4 h-4" /> Add category
        </button>
      </form>

      {/* Tree */}
      <div className="space-y-4">
        {mains.map((main) => (
          <div key={main.id} className="bg-white border border-navy-100 rounded overflow-hidden">
            {renderRow(main, false)}
            {subsOf(main.id).map((sub) => renderRow(sub, true))}
          </div>
        ))}

        {mains.length === 0 && (
          <p className="text-center text-navy-400 text-sm py-8 bg-white border border-navy-100 rounded">
            No categories yet.
          </p>
        )}
      </div>
    </div>
  );
}
