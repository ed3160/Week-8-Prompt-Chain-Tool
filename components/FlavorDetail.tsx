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
  humor_flavor_step_type_id: number | null;
  llm_input_type_id: number;
  llm_output_type_id: number;
}

interface LlmModel {
  id: number;
  name: string;
  provider_model_id: string | null;
}

interface LookupItem {
  id: number;
  slug: string;
  description: string | null;
}

const INPUT_CLASS =
  "w-full px-3 py-2 text-sm rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-neutral-400";

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
  const [inputTypes, setInputTypes] = useState<LookupItem[]>([]);
  const [outputTypes, setOutputTypes] = useState<LookupItem[]>([]);
  const [stepTypes, setStepTypes] = useState<LookupItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Create step form
  const [showCreate, setShowCreate] = useState(false);
  const [newDesc, setNewDesc] = useState("");
  const [newModelId, setNewModelId] = useState<string>("");
  const [newTemp, setNewTemp] = useState("0.7");
  const [newSystemPrompt, setNewSystemPrompt] = useState("");
  const [newUserPrompt, setNewUserPrompt] = useState("");
  const [newStepTypeId, setNewStepTypeId] = useState<string>("3");
  const [newInputTypeId, setNewInputTypeId] = useState<string>("2");
  const [newOutputTypeId, setNewOutputTypeId] = useState<string>("1");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Edit step
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editDesc, setEditDesc] = useState("");
  const [editModelId, setEditModelId] = useState<string>("");
  const [editTemp, setEditTemp] = useState("0.7");
  const [editSystemPrompt, setEditSystemPrompt] = useState("");
  const [editUserPrompt, setEditUserPrompt] = useState("");
  const [editStepTypeId, setEditStepTypeId] = useState<string>("3");
  const [editInputTypeId, setEditInputTypeId] = useState<string>("2");
  const [editOutputTypeId, setEditOutputTypeId] = useState<string>("1");
  const [saving, setSaving] = useState(false);

  const fetchSteps = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();
    const { data } = await supabase
      .from("humor_flavor_steps")
      .select("id, humor_flavor_id, order_by, description, llm_model_id, llm_temperature, llm_system_prompt, llm_user_prompt, humor_flavor_step_type_id, llm_input_type_id, llm_output_type_id")
      .eq("humor_flavor_id", flavorId)
      .order("order_by", { ascending: true });
    setSteps((data ?? []) as FlavorStep[]);
    setLoading(false);
  }, [flavorId]);

  const fetchLookups = useCallback(async () => {
    const supabase = createClient();
    const [modelsRes, inputRes, outputRes, stepTypesRes] = await Promise.all([
      supabase.from("llm_models").select("id, name, provider_model_id").order("name"),
      supabase.from("llm_input_types").select("id, slug, description").order("id"),
      supabase.from("llm_output_types").select("id, slug, description").order("id"),
      supabase.from("humor_flavor_step_types").select("id, slug, description").order("id"),
    ]);
    setModels((modelsRes.data ?? []) as LlmModel[]);
    setInputTypes((inputRes.data ?? []) as LookupItem[]);
    setOutputTypes((outputRes.data ?? []) as LookupItem[]);
    setStepTypes((stepTypesRes.data ?? []) as LookupItem[]);
  }, []);

  useEffect(() => {
    fetchSteps();
    fetchLookups();
  }, [fetchSteps, fetchLookups]);

  const handleCreateStep = async () => {
    if (!newInputTypeId || !newOutputTypeId) {
      setError("Input type and output type are required.");
      return;
    }
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
      humor_flavor_step_type_id: newStepTypeId ? parseInt(newStepTypeId) : null,
      llm_input_type_id: parseInt(newInputTypeId),
      llm_output_type_id: parseInt(newOutputTypeId),
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
    setNewStepTypeId("3");
    setNewInputTypeId("2");
    setNewOutputTypeId("1");
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
    setEditStepTypeId(s.humor_flavor_step_type_id?.toString() ?? "3");
    setEditInputTypeId(s.llm_input_type_id.toString());
    setEditOutputTypeId(s.llm_output_type_id.toString());
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
        humor_flavor_step_type_id: editStepTypeId ? parseInt(editStepTypeId) : null,
        llm_input_type_id: parseInt(editInputTypeId),
        llm_output_type_id: parseInt(editOutputTypeId),
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

  const [applyingTemplate, setApplyingTemplate] = useState(false);

  const applyTemplate = async (templateName: "standard" | "minimal") => {
    setApplyingTemplate(true);
    setError(null);
    const supabase = createClient();

    const templates: Record<string, Array<{
      order_by: number;
      description: string;
      llm_model_id: number;
      llm_temperature: number;
      humor_flavor_step_type_id: number;
      llm_input_type_id: number;
      llm_output_type_id: number;
      llm_system_prompt: string;
      llm_user_prompt: string;
    }>> = {
      standard: [
        {
          order_by: 1,
          description: "Celebrity & Brand Recognition",
          llm_model_id: 14, // Gemini 2.5 Flash
          llm_temperature: 0.7,
          humor_flavor_step_type_id: 1,
          llm_input_type_id: 1, // image-and-text
          llm_output_type_id: 1, // string
          llm_system_prompt: "You are an expert at identifying celebrities, public figures, brands, and cultural references in images. You only respond in JSON.",
          llm_user_prompt: `Identify any famous or recognizable content in this image including people, shows, movies, locations, brands, events, or memes.

Respond in JSON format:
{
  "content": [
    {
      "name": "Full name",
      "type": "celebrity" | "politician" | "cartoon_character" | "tv_show" | "movie" | "location" | "brand" | "meme" | "other",
      "confidence": 0-100,
      "description": "Brief context"
    }
  ],
  "scene_context": "Overall description if from famous media or a significant event"
}

If nothing recognizable, return: { "content": [], "scene_context": "" }
Only respond in JSON.`,
        },
        {
          order_by: 2,
          description: "Image Description",
          llm_model_id: 14,
          llm_temperature: 0.7,
          humor_flavor_step_type_id: 2,
          llm_input_type_id: 1, // image-and-text
          llm_output_type_id: 1, // string
          llm_system_prompt: "You are a detailed image description assistant. Describe images vividly and accurately.",
          llm_user_prompt: `Using this recognition context: \${step1Output}

Describe this image in rich detail:
- The subject's demeanor and expression
- How the background relates to the foreground
- Any notable buildings, locations, or settings
- If from a movie, show, or cultural event, include that context

If the subject is not human, anthropomorphize it. Note any potentially humorous elements. Keep under 150 words.`,
        },
        {
          order_by: 3,
          description: "Caption Generation",
          llm_model_id: 17, // GPT 5 Mini
          llm_temperature: 1.0,
          humor_flavor_step_type_id: 3,
          llm_input_type_id: 2, // text-only
          llm_output_type_id: 2, // array
          llm_system_prompt: `You are a witty caption writer. Generate short, punchy captions that are funny and relatable.

Return ONLY a valid JSON array of strings. No markdown, no explanation, no code fences.`,
          llm_user_prompt: `Image description: \${step2Output}

People/brands identified: \${step1Output}

Here is some additional context for the image, if available:
\${imageAdditionalContext}

Write 10 short, funny captions for this image.

Rules:
- Under 12 words each
- Sharp, ironic, and punchy like a meme page
- No long setups or explanations
- No "When you X but Y" formula

Return ONLY a JSON array of 10 caption strings.`,
        },
      ],
      minimal: [
        {
          order_by: 1,
          description: "Describe Image",
          llm_model_id: 14, // Gemini 2.5 Flash
          llm_temperature: 0.7,
          humor_flavor_step_type_id: 2,
          llm_input_type_id: 1, // image-and-text
          llm_output_type_id: 1, // string
          llm_system_prompt: "You are a concise image description assistant.",
          llm_user_prompt: `Describe this image in 2-3 sentences. Focus on the subject, their expression, and the setting. Note anything funny or unusual.`,
        },
        {
          order_by: 2,
          description: "Generate Captions",
          llm_model_id: 17, // GPT 5 Mini
          llm_temperature: 1.0,
          humor_flavor_step_type_id: 3,
          llm_input_type_id: 2, // text-only
          llm_output_type_id: 2, // array
          llm_system_prompt: `You are a funny caption writer. Return ONLY a valid JSON array of strings. No markdown, no explanation.`,
          llm_user_prompt: `Image description: \${step1Output}

Additional context: \${imageAdditionalContext}

Write 5 short, funny captions for this image. Keep each under 10 words.

Return ONLY a JSON array of 5 caption strings.`,
        },
      ],
    };

    const templateSteps = templates[templateName];
    const rows = templateSteps.map((s) => ({
      ...s,
      humor_flavor_id: flavorId,
      created_by_user_id: userId,
      modified_by_user_id: userId,
    }));

    const { error: insertError } = await supabase.from("humor_flavor_steps").insert(rows);
    setApplyingTemplate(false);
    if (insertError) {
      setError(`Failed to apply template: ${insertError.message}`);
      return;
    }
    fetchSteps();
  };

  const modelName = (id: number | null) => {
    if (!id) return "-";
    const m = models.find((m) => m.id === id);
    return m ? m.name : `#${id}`;
  };

  const lookupName = (items: LookupItem[], id: number | null) => {
    if (!id) return "-";
    const item = items.find((i) => i.id === id);
    return item ? item.slug : `#${id}`;
  };

  const typeSelectFields = (
    stepTypeVal: string,
    setStepType: (v: string) => void,
    inputTypeVal: string,
    setInputType: (v: string) => void,
    outputTypeVal: string,
    setOutputType: (v: string) => void,
  ) => (
    <div className="grid grid-cols-3 gap-3">
      <div>
        <label className="block text-xs text-neutral-500 dark:text-neutral-400 mb-1">Step Type</label>
        <select value={stepTypeVal} onChange={(e) => setStepType(e.target.value)} className={INPUT_CLASS}>
          <option value="">None</option>
          {stepTypes.map((t) => (
            <option key={t.id} value={t.id}>{t.slug}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-xs text-neutral-500 dark:text-neutral-400 mb-1">Input Type *</label>
        <select value={inputTypeVal} onChange={(e) => setInputType(e.target.value)} className={INPUT_CLASS}>
          {inputTypes.map((t) => (
            <option key={t.id} value={t.id}>{t.slug}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-xs text-neutral-500 dark:text-neutral-400 mb-1">Output Type *</label>
        <select value={outputTypeVal} onChange={(e) => setOutputType(e.target.value)} className={INPUT_CLASS}>
          {outputTypes.map((t) => (
            <option key={t.id} value={t.id}>{t.slug}</option>
          ))}
        </select>
      </div>
    </div>
  );

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
                className={INPUT_CLASS}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-neutral-500 dark:text-neutral-400 mb-1">LLM Model</label>
                <select value={newModelId} onChange={(e) => setNewModelId(e.target.value)} className={INPUT_CLASS}>
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
                  className={INPUT_CLASS}
                />
              </div>
            </div>
            {typeSelectFields(newStepTypeId, setNewStepTypeId, newInputTypeId, setNewInputTypeId, newOutputTypeId, setNewOutputTypeId)}
            <div>
              <label className="block text-xs text-neutral-500 dark:text-neutral-400 mb-1">System Prompt</label>
              <textarea
                value={newSystemPrompt}
                onChange={(e) => setNewSystemPrompt(e.target.value)}
                rows={3}
                placeholder="System instructions for the LLM"
                className={INPUT_CLASS + " font-mono"}
              />
            </div>
            <div>
              <label className="block text-xs text-neutral-500 dark:text-neutral-400 mb-1">User Prompt</label>
              <textarea
                value={newUserPrompt}
                onChange={(e) => setNewUserPrompt(e.target.value)}
                rows={3}
                placeholder="User prompt template"
                className={INPUT_CLASS + " font-mono"}
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
        <div className="space-y-6">
          <div className="text-center py-8">
            <p className="text-neutral-500 dark:text-neutral-400 mb-2">
              No steps yet. Pick a template to get started, or add steps manually.
            </p>
            <p className="text-xs text-neutral-400 dark:text-neutral-500">
              Each flavor needs at least one step that processes the image and one that outputs captions as a JSON array.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Standard 3-step template */}
            <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg p-5">
              <h4 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 mb-2">
                Standard (3 steps)
              </h4>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-3">
                The recommended setup. Recognizes celebrities/brands, describes the image, then generates 10 captions.
              </p>
              <ol className="text-xs text-neutral-500 dark:text-neutral-400 space-y-1 mb-4 list-decimal list-inside">
                <li>Celebrity & Brand Recognition (Gemini Flash, image input)</li>
                <li>Image Description (Gemini Flash, image input)</li>
                <li>Caption Generation (GPT 5 Mini, text input, array output)</li>
              </ol>
              <button
                onClick={() => applyTemplate("standard")}
                disabled={applyingTemplate}
                className="w-full px-4 py-2 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 transition-colors cursor-pointer disabled:cursor-default"
              >
                {applyingTemplate ? "Applying..." : "Use Standard Template"}
              </button>
            </div>

            {/* Minimal 2-step template */}
            <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg p-5">
              <h4 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 mb-2">
                Minimal (2 steps)
              </h4>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-3">
                A simpler setup. Describes the image, then generates 5 captions. Faster but less context-aware.
              </p>
              <ol className="text-xs text-neutral-500 dark:text-neutral-400 space-y-1 mb-4 list-decimal list-inside">
                <li>Image Description (Gemini Flash, image input)</li>
                <li>Caption Generation (GPT 5 Mini, text input, array output)</li>
              </ol>
              <button
                onClick={() => applyTemplate("minimal")}
                disabled={applyingTemplate}
                className="w-full px-4 py-2 text-sm font-medium rounded-lg bg-neutral-700 dark:bg-neutral-600 text-white hover:bg-neutral-800 dark:hover:bg-neutral-500 disabled:opacity-50 transition-colors cursor-pointer disabled:cursor-default"
              >
                {applyingTemplate ? "Applying..." : "Use Minimal Template"}
              </button>
            </div>
          </div>
        </div>
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
                    className={INPUT_CLASS}
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-neutral-500 dark:text-neutral-400 mb-1">LLM Model</label>
                      <select value={editModelId} onChange={(e) => setEditModelId(e.target.value)} className={INPUT_CLASS}>
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
                        className={INPUT_CLASS}
                      />
                    </div>
                  </div>
                  {typeSelectFields(editStepTypeId, setEditStepTypeId, editInputTypeId, setEditInputTypeId, editOutputTypeId, setEditOutputTypeId)}
                  <div>
                    <label className="block text-xs text-neutral-500 dark:text-neutral-400 mb-1">System Prompt</label>
                    <textarea
                      value={editSystemPrompt}
                      onChange={(e) => setEditSystemPrompt(e.target.value)}
                      rows={4}
                      className={INPUT_CLASS + " font-mono"}
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-neutral-500 dark:text-neutral-400 mb-1">User Prompt</label>
                    <textarea
                      value={editUserPrompt}
                      onChange={(e) => setEditUserPrompt(e.target.value)}
                      rows={4}
                      className={INPUT_CLASS + " font-mono"}
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
                      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 ml-10 text-xs text-neutral-400 dark:text-neutral-500">
                        <span>Model: {modelName(s.llm_model_id)}</span>
                        <span>Temp: {s.llm_temperature ?? "-"}</span>
                        <span>Type: {lookupName(stepTypes, s.humor_flavor_step_type_id)}</span>
                        <span>In: {lookupName(inputTypes, s.llm_input_type_id)}</span>
                        <span>Out: {lookupName(outputTypes, s.llm_output_type_id)}</span>
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
