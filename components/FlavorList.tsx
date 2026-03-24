"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";

interface HumorFlavor {
  id: number;
  slug: string;
  description: string | null;
  created_datetime_utc: string;
}

export default function FlavorList({
  userId,
  onSelect,
  onTest,
  onViewCaptions,
}: {
  userId: string;
  onSelect: (id: number, slug: string) => void;
  onTest: (id: number, slug: string) => void;
  onViewCaptions: (id: number, slug: string) => void;
}) {
  const [flavors, setFlavors] = useState<HumorFlavor[]>([]);
  const [stepCounts, setStepCounts] = useState<Record<number, number>>({});
  const [loading, setLoading] = useState(true);

  // Create form
  const [showCreate, setShowCreate] = useState(false);
  const [newSlug, setNewSlug] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [creating, setCreating] = useState(false);

  // Edit form
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editSlug, setEditSlug] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchFlavors = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();
    const { data } = await supabase
      .from("humor_flavors")
      .select("id, slug, description, created_datetime_utc")
      .order("created_datetime_utc", { ascending: false });

    const items = (data ?? []) as HumorFlavor[];
    setFlavors(items);

    if (items.length > 0) {
      const ids = items.map((r) => r.id);
      const { data: steps } = await supabase
        .from("humor_flavor_steps")
        .select("humor_flavor_id")
        .in("humor_flavor_id", ids);
      const counts: Record<number, number> = {};
      for (const s of steps ?? []) {
        counts[s.humor_flavor_id] = (counts[s.humor_flavor_id] || 0) + 1;
      }
      setStepCounts(counts);
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    fetchFlavors();
  }, [fetchFlavors]);

  const handleCreate = async () => {
    if (!newSlug.trim()) return;
    setCreating(true);
    setError(null);
    const supabase = createClient();
    const { data: inserted, error: insertError } = await supabase.from("humor_flavors").insert({
      slug: newSlug.trim(),
      description: newDesc.trim() || null,
      created_by_user_id: userId,
      modified_by_user_id: userId,
    }).select("id, slug").single();
    setCreating(false);
    if (insertError) {
      setError(`Failed to create flavor: ${insertError.message}`);
      return;
    }
    const slug = newSlug.trim();
    setNewSlug("");
    setNewDesc("");
    setShowCreate(false);
    if (inserted) {
      onSelect(inserted.id, inserted.slug);
    } else {
      fetchFlavors();
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this humor flavor and all its steps?")) return;
    const supabase = createClient();
    await supabase.from("humor_flavor_steps").delete().eq("humor_flavor_id", id);
    await supabase.from("humor_flavors").delete().eq("id", id);
    fetchFlavors();
  };

  const startEdit = (f: HumorFlavor) => {
    setEditingId(f.id);
    setEditSlug(f.slug);
    setEditDesc(f.description ?? "");
  };

  const handleUpdate = async () => {
    if (editingId === null || !editSlug.trim()) return;
    setSaving(true);
    setError(null);
    const supabase = createClient();
    const { error: updateError } = await supabase
      .from("humor_flavors")
      .update({ slug: editSlug.trim(), description: editDesc.trim() || null, modified_by_user_id: userId })
      .eq("id", editingId);
    setSaving(false);
    if (updateError) {
      setError(`Failed to update flavor: ${updateError.message}`);
      return;
    }
    setEditingId(null);
    fetchFlavors();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-neutral-900 dark:text-neutral-100">
          Humor Flavors
        </h2>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="px-4 py-2 text-sm font-medium rounded-lg bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 hover:bg-neutral-800 dark:hover:bg-neutral-100 transition-colors cursor-pointer"
        >
          {showCreate ? "Cancel" : "+ New Flavor"}
        </button>
      </div>

      {/* Create form */}
      {showCreate && (
        <div className="mb-6 p-4 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg">
          <h3 className="text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-3">
            Create Humor Flavor
          </h3>
          <div className="space-y-3">
            <div>
              <label className="block text-xs text-neutral-500 dark:text-neutral-400 mb-1">
                Slug
              </label>
              <input
                type="text"
                value={newSlug}
                onChange={(e) => setNewSlug(e.target.value)}
                placeholder="e.g. sarcastic-wit"
                className="w-full px-3 py-2 text-sm rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-neutral-400"
              />
            </div>
            <div>
              <label className="block text-xs text-neutral-500 dark:text-neutral-400 mb-1">
                Description
              </label>
              <textarea
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                placeholder="Optional description"
                rows={2}
                className="w-full px-3 py-2 text-sm rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-neutral-400"
              />
            </div>
            <button
              onClick={handleCreate}
              disabled={creating || !newSlug.trim()}
              className="px-4 py-2 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 transition-colors cursor-pointer disabled:cursor-default"
            >
              {creating ? "Creating..." : "Create"}
            </button>
          </div>
        </div>
      )}

      {/* Error display */}
      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-sm text-red-700 dark:text-red-300">
          {error}
        </div>
      )}

      {/* Flavor list */}
      {loading ? (
        <p className="text-neutral-500 dark:text-neutral-400">Loading...</p>
      ) : flavors.length === 0 ? (
        <p className="text-neutral-500 dark:text-neutral-400">
          No humor flavors yet. Create one to get started.
        </p>
      ) : (
        <div className="space-y-3">
          {flavors.map((f) => (
            <div
              key={f.id}
              className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg p-4"
            >
              {editingId === f.id ? (
                <div className="space-y-3">
                  <input
                    type="text"
                    value={editSlug}
                    onChange={(e) => setEditSlug(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-neutral-400"
                  />
                  <textarea
                    value={editDesc}
                    onChange={(e) => setEditDesc(e.target.value)}
                    rows={2}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-neutral-400"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={handleUpdate}
                      disabled={saving}
                      className="px-3 py-1.5 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 cursor-pointer disabled:cursor-default"
                    >
                      {saving ? "Saving..." : "Save"}
                    </button>
                    <button
                      onClick={() => setEditingId(null)}
                      className="px-3 py-1.5 text-sm rounded-lg border border-neutral-300 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">
                          {f.slug}
                        </h3>
                        <span className="text-xs text-neutral-400 dark:text-neutral-500 font-mono">
                          #{f.id}
                        </span>
                      </div>
                      {f.description && (
                        <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">
                          {f.description}
                        </p>
                      )}
                      <div className="flex items-center gap-4 mt-2 text-xs text-neutral-400 dark:text-neutral-500">
                        <span>{stepCounts[f.id] ?? 0} steps</span>
                        <span>
                          Created{" "}
                          {new Date(f.created_datetime_utc).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-neutral-100 dark:border-neutral-800">
                    <button
                      onClick={() => onSelect(f.id, f.slug)}
                      className="px-3 py-1.5 text-xs font-medium rounded-lg bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700 cursor-pointer transition-colors"
                    >
                      Edit Steps
                    </button>
                    <button
                      onClick={() => onTest(f.id, f.slug)}
                      className="px-3 py-1.5 text-xs font-medium rounded-lg bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900 cursor-pointer transition-colors"
                    >
                      Test
                    </button>
                    <button
                      onClick={() => onViewCaptions(f.id, f.slug)}
                      className="px-3 py-1.5 text-xs font-medium rounded-lg bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-300 hover:bg-green-100 dark:hover:bg-green-900 cursor-pointer transition-colors"
                    >
                      View Captions
                    </button>
                    <button
                      onClick={() => startEdit(f)}
                      className="px-3 py-1.5 text-xs font-medium rounded-lg bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900 cursor-pointer transition-colors"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(f.id)}
                      className="px-3 py-1.5 text-xs font-medium rounded-lg bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-900 cursor-pointer transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
