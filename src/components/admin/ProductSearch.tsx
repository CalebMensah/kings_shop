"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { HiOutlineSearch, HiOutlineX } from "react-icons/hi";

export function ProductSearch() {
  const router = useRouter();
  const pathname = usePathname();
  const current = useSearchParams().get("q") ?? "";
  const [value, setValue] = useState(current);
  const pushed = useRef(current);

  function navigate(next: string) {
    pushed.current = next;
    router.replace(next ? `${pathname}?q=${encodeURIComponent(next)}` : pathname, { scroll: false });
  }

  // Follow the address bar when it changes from outside (the sidebar link, back button)
  useEffect(() => {
    if (current !== pushed.current) {
      pushed.current = current;
      setValue(current);
    }
  }, [current]);

  // Search a moment after the typing pauses
  useEffect(() => {
    const next = value.trim();
    if (next === pushed.current.trim()) return;
    const timer = setTimeout(() => navigate(next), 350);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        navigate(value.trim());
      }}
      className="relative w-full max-w-sm"
      role="search"
    >
      <HiOutlineSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-navy-300" />
      <input
        type="text"
        inputMode="search"
        enterKeyHint="search"
        autoComplete="off"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Search products by name"
        aria-label="Search products"
        className="w-full border border-navy-100 rounded pl-9 pr-9 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-turquoise"
      />
      {value && (
        <button
          type="button"
          onClick={() => {
            setValue("");
            navigate("");
          }}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-navy-300 hover:text-navy-600"
          aria-label="Clear search"
        >
          <HiOutlineX className="w-4 h-4" />
        </button>
      )}
    </form>
  );
}
