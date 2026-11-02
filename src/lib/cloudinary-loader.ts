import type { ImageLoaderProps } from "next/image";

// Cloudinary does the resizing and compression, so Vercel's image optimizer isn't used.
export default function cloudinaryLoader({ src, width }: ImageLoaderProps) {
  const marker = "/image/upload/";
  const at = src.indexOf(marker);

  // Local files (like /hero-banner.jpg) and other hosts are served as they are
  if (!src.startsWith("https://res.cloudinary.com/") || at === -1) return src;

  const base = src.slice(0, at + marker.length);
  const rest = src.slice(at + marker.length);
  return `${base}f_auto,q_auto,w_${width},c_limit/${rest}`;
}
