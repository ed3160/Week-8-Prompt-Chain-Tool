"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";

interface CaptionRow {
  id: number;
  content: string;
  image_id: string | null;
  created_datetime_utc: string;
  like_count: number | null;
  images?: { url: string | null }[] | { url: string | null } | null;
}

export default function CaptionViewer({
  flavorId,
  flavorSlug,
}: {
  flavorId: number;
  flavorSlug: string;
}) {
  const [captions, setCaptions] = useState<CaptionRow[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCaptions = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();
    const { data } = await supabase
      .from("captions")
      .select("id, content, image_id, created_datetime_utc, like_count, images(url)")
      .eq("humor_flavor_id", flavorId)
      .order("created_datetime_utc", { ascending: false })
      .limit(50);
    setCaptions((data ?? []) as CaptionRow[]);
    setLoading(false);
  }, [flavorId]);

  useEffect(() => {
    fetchCaptions();
  }, [fetchCaptions]);

  return (
    <div>
      <h2 className="text-xl font-bold text-neutral-900 dark:text-neutral-100 mb-1">
        Captions: {flavorSlug}
      </h2>
      <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-6">
        Captions generated using this humor flavor ({captions.length} shown).
      </p>

      {loading ? (
        <p className="text-neutral-500 dark:text-neutral-400">Loading...</p>
      ) : captions.length === 0 ? (
        <p className="text-neutral-500 dark:text-neutral-400">
          No captions found for this flavor. Try testing it first.
        </p>
      ) : (
        <div className="space-y-3">
          {captions.map((c) => (
            <div
              key={c.id}
              className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg p-4 flex gap-4"
            >
              {(() => {
                const img = Array.isArray(c.images) ? c.images[0] : c.images;
                return img?.url ? (
                  <img
                    src={img.url}
                    alt=""
                    className="w-16 h-16 rounded-lg object-cover shrink-0"
                  />
                ) : null;
              })()}
              <div className="flex-1 min-w-0">
                <p className="text-sm text-neutral-900 dark:text-neutral-100">
                  {c.content}
                </p>
                <div className="flex gap-4 mt-2 text-xs text-neutral-400 dark:text-neutral-500">
                  <span>
                    {new Date(c.created_datetime_utc).toLocaleDateString()}
                  </span>
                  {c.like_count !== null && c.like_count > 0 && (
                    <span>{c.like_count} likes</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
