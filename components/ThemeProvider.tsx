"use client";

import { createContext, useContext, useEffect, useState } from "react";

type Theme = "light" | "dark" | "system";

const STORAGE_KEY = "flavors-theme";

const ThemeContext = createContext<{
  theme: Theme;
  setTheme: (t: Theme) => void;
  mounted: boolean;
}>({ theme: "system", setTheme: () => {}, mounted: false });

export function useTheme() {
  return useContext(ThemeContext);
}

function getStored(): Theme {
  if (typeof window === "undefined") return "system";
  const v = localStorage.getItem(STORAGE_KEY);
  if (v === "light" || v === "dark" || v === "system") return v;
  return "system";
}

function applyTheme(theme: Theme) {
  const root = document.documentElement;
  const dark =
    theme === "dark" ||
    (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  if (dark) root.classList.add("dark");
  else root.classList.remove("dark");
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("system");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setThemeState(getStored());
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    applyTheme(theme);
    localStorage.setItem(STORAGE_KEY, theme);
  }, [theme, mounted]);

  useEffect(() => {
    if (theme !== "system") return;
    const m = window.matchMedia("(prefers-color-scheme: dark)");
    const fn = () => applyTheme("system");
    m.addEventListener("change", fn);
    return () => m.removeEventListener("change", fn);
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme: setThemeState, mounted }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function ThemeToggle() {
  const { theme, setTheme, mounted } = useTheme();
  if (!mounted) return null;

  const cycle = () => {
    if (theme === "light") setTheme("dark");
    else if (theme === "dark") setTheme("system");
    else setTheme("light");
  };

  const labels: Record<Theme, string> = { light: "Light", dark: "Dark", system: "System" };
  const icons: Record<Theme, string> = { light: "\u2600", dark: "\u263E", system: "\u25D1" };

  return (
    <button
      type="button"
      onClick={cycle}
      aria-label="Toggle theme"
      className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors"
      title={`Theme: ${theme}`}
    >
      <span>{icons[theme]}</span>
      <span className="hidden sm:inline">{labels[theme]}</span>
    </button>
  );
}
