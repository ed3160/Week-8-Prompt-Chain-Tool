"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";

interface FlavorStep {
  id: number;
  humor_flavor_id: number;
  order_by: number;
  description: string | null;
  llm_model_id: number | null;
  llm_temperature: number | null;
  llm_system_prompt: string | null;
  llm_user_prompt: string | null;
}

interface LlmModel {
  id: number;
  name: string;
  provider_model_id: string | null;
}

export default function FlavorDetail({
  userId,
  flavorId,
  flavorSlug,
  onBack,
}: {
  userId: string;
  flavorId: number;
  flavorSlug: string;
  onBack: () => void;
}) {
  const [steps, setSteps] = useState<FlavorStep[]>([]);
  const [models, setModels] = useState<LlmModel[]>([]);
  const [loading, setLoading] = useState(true);

  // Create step form
  const [showCreate, setShowCreate] = useState(false);
  const [newDesc, setNewDesc] = useState("");
  const [newModelId, setNewModelId] = useState<string>("");
  const [newTemp, setNewTemp] = useState("0.7");
  const [newSystemPrompt, setNewSystemPrompt] = useState("");
  const [newUserPrompt, setNewUserPrompt] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Edit step
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editDesc, setEditDesc] = useState("");
  const [editModelId, setEditModelId] = useState<string>("");
  const [editTemp, setEditTemp] = useState("0.7");
  const [editSystemPrompt, setEditSystemPrompt] = useState("");
  const [editUserPrompt, setEditUserPrompt] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchSteps = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();
    const { data } = await supabase
      .from("humor_flavor_steps")
      .select("id, humor_flavor_id, order_by, description, llm_model_id, llm_temperature, llm_system_prompt, llm_user_prompt")
      .eq("humor_flavor_id", flavorId)
      .order("order_by", { ascending: true });
    setSteps((data ?? []) as FlavorStep[]);
    setLoading(false);
  }, [flavorId]);

  const fetchModels = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from("llm_models")
      .select("id, name, provider_model_id")
      .order("name", { ascending: true });
    setModels((data ?? []) as LlmModel[]);
  }, []);

  useEffect(() => {
    fetchSteps();
    fetchModels();
  }, [fetchSteps, fetchModels]);

  const handleCreateStep = async () => {
    setCreating(true);
    setError(null);
    const supabase = createClient();
    const nextOrder = steps.length > 0 ? Math.max(...steps.map((s) => s.order_by)) + 1 : 1;
    const { error: insertError } = await supabase.from("humor_flavor_steps").insert({
      humor_flavor_id: flavorId,
      order_by: nextOrder,
      description: newDesc.trim() || null,
      llm_model_id: newModelId ? parseInt(newModelId) : null,
      llm_temperature: newTemp ? parseFloat(newTemp) : null,
      llm_system_prompt: newSystemPrompt.trim() || null,
      llm_user_prompt: newUserPrompt.trim() || null,
      created_by_user_id: userId,
      modified_by_user_id: userId,
    });
    setCreating(false);
    if (insertError) {
      setError(`Failed to create step: ${insertError.message}`);
      return;
    }
    setNewDesc("");
    setNewModelId("");
    setNewTemp("0.7");
    setNewSystemPrompt("");
    setNewUserPrompt("");
    setShowCreate(false);
    fetchSteps();
  };

  const handleDeleteStep = async (id: number) => {
    if (!confirm("Delete this step?")) return;
    const supabase = createClient();
    await supabase.from("humor_flavor_steps").delete().eq("id", id);
    fetchSteps();
  };

  const startEditStep = (s: FlavorStep) => {
    setEditingId(s.id);
    setEditDesc(s.description ?? "");
    setEditModelId(s.llm_model_id?.toString() ?? "");
    setEditTemp(s.llm_temperature?.toString() ?? "0.7");
    setEditSystemPrompt(s.llm_system_prompt ?? "");
    setEditUserPrompt(s.llm_user_prompt ?? "");
  };

  const handleUpdateStep = async () => {
    if (editingId === null) return;
    setSaving(true);
    setError(null);
    const supabase = createClient();
    const { error: updateError } = await supabase
      .from("humor_flavor_steps")
      .update({
        description: editDesc.trim() || null,
        llm_model_id: editModelId ? parseInt(editModelId) : null,
        llm_temperature: editTemp ? parseFloat(editTemp) : null,
        llm_system_prompt: editSystemPrompt.trim() || null,
        llm_user_prompt: editUserPrompt.trim() || null,
        modified_by_user_id: userId,
      })
      .eq("id", editingId);
    setSaving(false);
    if (updateError) {
      setError(`Failed to update step: ${updateError.message}`);
      return;
    }
    setEditingId(null);
    fetchSteps();
  };

  const handleMoveStep = async (stepId: number, direction: "up" | "down") => {
    const idx = steps.findIndex((s) => s.id === stepId);
    if (idx === -1) return;
    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= steps.length) return;

    const supabase = createClient();
    const currentOrder = steps[idx].order_by;
    const swapOrder = steps[swapIdx].order_by;

    await Promise.all([
      supabase.from("humor_flavor_steps").update({ order_by: swapOrder, modified_by_user_id: userId }).eq("id", steps[idx].id),
      supabase.from("humor_flavor_steps").update({ order_by: currentOrder, modified_by_user_id: userId }).eq("id", steps[swapIdx].id),
    ]);

    fetchSteps();
  };

  const modelName = (id: number | null) => {
    if (!id) return "-";
    const m = models.find((m) => m.id === id);
    return m ? m.name : `#${id}`;
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-neutral-900 dark:text-neutral-100">
            {flavorSlug}
          </h2>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            Manage steps for this humor flavor
          </p>
        </div>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="px-4 py-2 text-sm font-medium rounded-lg bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 hover:bg-neutral-800 dark:hover:bg-neutral-100 transition-colors cursor-pointer"
        >
          {showCreate ? "Cancel" : "+ Add Step"}
        </button>
      </div>

      {/* Create step form */}
      {showCreate && (
        <div className="mb-6 p-4 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg">
          <h3 className="text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-3">
            New Step
          </h3>
          <div className="space-y-3">
            <div>
              <label className="block text-xs text-neutral-500 dark:text-neutral-400 mb-1">Description</label>
              <input
                type="text"
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                placeholder="What this step does"
                className="w-full px-3 py-2 text-sm rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-neutral-400"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-neutral-500 dark:text-neutral-400 mb-1">LLM Model</label>
                <select
                  value={newModelId}
                  onChange={(e) => setNewModelId(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-neutral-400"
                >
                  <option value="">None</option>
                  {models.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} {m.provider_model_id ? `(${m.provider_model_id})` : ""}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-neutral-500 dark:text-neutral-400 mb-1">Temperature</label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="2"
                  value={newTemp}
                  onChange={(e) => setNewTemp(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-neutral-400"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs text-neutral-500 dark:text-neutral-400 mb-1">System Prompt</label>
              <textarea
                value={newSystemPrompt}
                onChange={(e) => setNewSystemPrompt(e.target.value)}
                rows={3}
                placeholder="System instructions for the LLM"
                className="w-full px-3 py-2 text-sm rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-neutral-400 font-mono"
              />
            </div>
            <div>
              <label className="block text-xs text-neutral-500 dark:text-neutral-400 mb-1">User Prompt</label>
              <textarea
                value={newUserPrompt}
                onChange={(e) => setNewUserPrompt(e.target.value)}
                rows={3}
                placeholder="User prompt template"
                className="w-full px-3 py-2 text-sm rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-neutral-400 font-mono"
              />
            </div>
            <button
              onClick={handleCreateStep}
              disabled={creating}
              className="px-4 py-2 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 transition-colors cursor-pointer disabled:cursor-default"
            >
              {creating ? "Creating..." : "Create Step"}
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

      {/* Steps list */}
      {loading ? (
        <p className="text-neutral-500 dark:text-neutral-400">Loading steps...</p>
      ) : steps.length === 0 ? (
        <p className="text-neutral-500 dark:text-neutral-400">
          No steps yet. Add a step to build the prompt chain.
        </p>
      ) : (
        <div className="space-y-3">
          {steps.map((s, idx) => (
            <div
              key={s.id}
              className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg p-4"
            >
              {editingId === s.id ? (
                <div className="space-y-3">
                  <input
                    type="text"
                    value={editDesc}
                    onChange={(e) => setEditDesc(e.target.value)}
                    placeholder="Description"
                    className="w-full px-3 py-2 text-sm rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-neutral-400"
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-neutral-500 dark:text-neutral-400 mb-1">LLM Model</label>
                      <select
                        value={editModelId}
                        onChange={(e) => setEditModelId(e.target.value)}
                        className="w-full px-3 py-2 text-sm rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-neutral-400"
                      >
                        <option value="">None</option>
                        {models.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.name} {m.provider_model_id ? `(${m.provider_model_id})` : ""}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-neutral-500 dark:text-neutral-400 mb-1">Temperature</label>
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        max="2"
                        value={editTemp}
                        onChange={(e) => setEditTemp(e.target.value)}
                        className="w-full px-3 py-2 text-sm rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-neutral-400"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs text-neutral-500 dark:text-neutral-400 mb-1">System Prompt</label>
                    <textarea
                      value={editSystemPrompt}
                      onChange={(e) => setEditSystemPrompt(e.target.value)}
                      rows={4}
                      className="w-full px-3 py-2 text-sm rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-neutral-400 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-neutral-500 dark:text-neutral-400 mb-1">User Prompt</label>
                    <textarea
                      value={editUserPrompt}
                      onChange={(e) => setEditUserPrompt(e.target.value)}
                      rows={4}
                      className="w-full px-3 py-2 text-sm rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-neutral-400 font-mono"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={handleUpdateStep}
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
                      <div className="flex items-center gap-3">
                        <span className="flex items-center justify-center w-7 h-7 rounded-full bg-neutral-100 dark:bg-neutral-800 text-sm font-bold text-neutral-600 dark:text-neutral-300">
                          {s.order_by}
                        </span>
                        <h4 className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                          {s.description || `Step ${s.order_by}`}
                        </h4>
                      </div>
                      <div className="flex gap-4 mt-2 ml-10 text-xs text-neutral-400 dark:text-neutral-500">
                        <span>Model: {modelName(s.llm_model_id)}</span>
                        <span>Temp: {s.llm_temperature ?? "-"}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleMoveStep(s.id, "up")}
                        disabled={idx === 0}
                        className="p-1 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 disabled:opacity-30 cursor-pointer disabled:cursor-default"
                        title="Move up"
                      >
                        &uarr;
                      </button>
                      <button
                        onClick={() => handleMoveStep(s.id, "down")}
                        disabled={idx === steps.length - 1}
                        className="p-1 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 disabled:opacity-30 cursor-pointer disabled:cursor-default"
                        title="Move down"
                      >
                        &darr;
                      </button>
                    </div>
                  </div>

                  {/* Prompts preview */}
                  {(s.llm_system_prompt || s.llm_user_prompt) && (
                    <div className="mt-3 ml-10 space-y-2">
                      {s.llm_system_prompt && (
                        <div>
                          <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400">
                            System:{" "}
                          </span>
                          <span className="text-xs text-neutral-600 dark:text-neutral-400 font-mono">
                            {s.llm_system_prompt.length > 150
                              ? s.llm_system_prompt.slice(0, 150) + "..."
                              : s.llm_system_prompt}
                          </span>
                        </div>
                      )}
                      {s.llm_user_prompt && (
                        <div>
                          <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400">
                            User:{" "}
                          </span>
                          <span className="text-xs text-neutral-600 dark:text-neutral-400 font-mono">
                            {s.llm_user_prompt.length > 150
                              ? s.llm_user_prompt.slice(0, 150) + "..."
                              : s.llm_user_prompt}
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="flex gap-2 mt-3 ml-10">
                    <button
                      onClick={() => startEditStep(s)}
                      className="px-3 py-1 text-xs rounded-lg bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900 cursor-pointer transition-colors"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteStep(s.id)}
                      className="px-3 py-1 text-xs rounded-lg bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-900 cursor-pointer transition-colors"
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
