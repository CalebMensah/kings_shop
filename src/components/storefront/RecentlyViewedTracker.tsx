"use client";

import { useEffect } from "react";
import { recordView } from "@/lib/recently-viewed";

export function RecentlyViewedTracker({ slug }: { slug: string }) {
  useEffect(() => {
    recordView(slug);
  }, [slug]);

  return null;
}
