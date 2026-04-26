"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { ThemeToggle } from "./ThemeProvider";
import FlavorList from "./FlavorList";
import FlavorDetail from "./FlavorDetail";
import FlavorTest from "./FlavorTest";
import CaptionViewer from "./CaptionViewer";

type View = "list" | "detail" | "test" | "captions";

interface NavState {
  view: View;
  flavorId: number | null;
  flavorSlug: string;
}

export default function AppShell({
  userId,
  userEmail,
}: {
  userId: string;
  userEmail: string;
}) {
  const [authorized, setAuthorized] = useState<boolean | null>(null);
  const [view, setView] = useState<View>("list");
  const [selectedFlavorId, setSelectedFlavorId] = useState<number | null>(null);
  const [selectedFlavorSlug, setSelectedFlavorSlug] = useState<string>("");
  const skipPush = useRef(false);
  const isFirstNavEffect = useRef(true);

  useEffect(() => {
    const check = async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("profiles")
        .select("is_superadmin, is_matrix_admin")
        .eq("id", userId)
        .single();
      if (error || !data) {
        setAuthorized(false);
        return;
      }
      setAuthorized(data.is_superadmin === true || data.is_matrix_admin === true);
    };
    check();
  }, [userId]);

  // Hydrate state from URL on mount and seed history (deep-link support)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const v = params.get("view");
    const id = params.get("id");
    const validViews: View[] = ["detail", "test", "captions"];
    let initialState: NavState = { view: "list", flavorId: null, flavorSlug: "" };

    if (v && (validViews as string[]).includes(v) && id) {
      const flavorId = Number(id);
      if (Number.isInteger(flavorId) && flavorId > 0) {
        skipPush.current = true;
        setView(v as View);
        setSelectedFlavorId(flavorId);
        initialState = { view: v as View, flavorId, flavorSlug: "" };
        const supabase = createClient();
        supabase
          .from("humor_flavors")
          .select("slug")
          .eq("id", flavorId)
          .single()
          .then(({ data }) => {
            if (data?.slug) setSelectedFlavorSlug(data.slug);
          });
      }
    }

    window.history.replaceState(
      initialState,
      "",
      initialState.view === "list"
        ? "/"
        : `/?view=${initialState.view}&id=${initialState.flavorId}`,
    );

    const handlePop = (e: PopStateEvent) => {
      const state = e.state as NavState | null;
      skipPush.current = true;
      if (state && state.view) {
        setView(state.view);
        setSelectedFlavorId(state.flavorId);
        setSelectedFlavorSlug(state.flavorSlug ?? "");
      } else {
        setView("list");
        setSelectedFlavorId(null);
        setSelectedFlavorSlug("");
      }
    };
    window.addEventListener("popstate", handlePop);
    return () => window.removeEventListener("popstate", handlePop);
  }, []);

  // Push browser history when view changes (skip the initial mount so URL params survive)
  useEffect(() => {
    if (isFirstNavEffect.current) {
      isFirstNavEffect.current = false;
      return;
    }
    if (skipPush.current) {
      skipPush.current = false;
      return;
    }
    const state: NavState = { view, flavorId: selectedFlavorId, flavorSlug: selectedFlavorSlug };
    if (view === "list") {
      window.history.replaceState(state, "", "/");
    } else {
      window.history.pushState(state, "", `/?view=${view}&id=${selectedFlavorId}`);
    }
  }, [view, selectedFlavorId, selectedFlavorSlug]);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = "/";
  };

  const openFlavor = useCallback((id: number, slug: string) => {
    setSelectedFlavorId(id);
    setSelectedFlavorSlug(slug);
    setView("detail");
  }, []);

  const openTest = useCallback((id: number, slug: string) => {
    setSelectedFlavorId(id);
    setSelectedFlavorSlug(slug);
    setView("test");
  }, []);

  const openCaptions = useCallback((id: number, slug: string) => {
    setSelectedFlavorId(id);
    setSelectedFlavorSlug(slug);
    setView("captions");
  }, []);

  const goBack = useCallback(() => {
    window.history.back();
  }, []);

  if (authorized === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50 dark:bg-neutral-950">
        <div className="text-neutral-500">Loading...</div>
      </div>
    );
  }

  if (!authorized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50 dark:bg-neutral-950">
        <div className="bg-white dark:bg-neutral-900 rounded-lg shadow-lg p-8 max-w-md w-full text-center border border-neutral-200 dark:border-neutral-800">
          <h1 className="text-xl font-bold text-neutral-900 dark:text-neutral-100 mb-2">
            Access Denied
          </h1>
          <p className="text-neutral-600 dark:text-neutral-400 text-sm mb-4">
            Your account ({userEmail}) does not have superadmin or matrix admin privileges.
          </p>
          <button
            onClick={handleLogout}
            className="text-sm text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 underline cursor-pointer"
          >
            Sign out
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950">
      {/* Top bar */}
      <header className="sticky top-0 z-30 bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {view !== "list" && (
              <button
                onClick={goBack}
                className="text-sm text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200 cursor-pointer"
              >
                &larr; Back
              </button>
            )}
            <h1
              className="text-lg font-bold text-neutral-900 dark:text-neutral-100 cursor-pointer"
              onClick={() => { setView("list"); setSelectedFlavorId(null); }}
            >
              Flavor Studio
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <span className="text-xs text-neutral-400 hidden sm:inline">{userEmail}</span>
            <button
              onClick={handleLogout}
              className="text-xs text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 cursor-pointer"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-5xl mx-auto px-4 py-6">
        {view === "list" && (
          <FlavorList
            userId={userId}
            onSelect={openFlavor}
            onTest={openTest}
            onViewCaptions={openCaptions}
          />
        )}
        {view === "detail" && selectedFlavorId !== null && (
          <FlavorDetail
            userId={userId}
            flavorId={selectedFlavorId}
            flavorSlug={selectedFlavorSlug}
            onBack={goBack}
          />
        )}
        {view === "test" && selectedFlavorId !== null && (
          <FlavorTest
            flavorId={selectedFlavorId}
            flavorSlug={selectedFlavorSlug}
          />
        )}
        {view === "captions" && selectedFlavorId !== null && (
          <CaptionViewer
            flavorId={selectedFlavorId}
            flavorSlug={selectedFlavorSlug}
          />
        )}
      </main>
    </div>
  );
}
