"use client";

import * as React from "react";
import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";

export function ThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="h-8 w-8 rounded-full border border-slate-700/50 bg-slate-800/30 flex items-center justify-center opacity-60" />
    );
  }

  const isDark = resolvedTheme === "dark";

  return (
    <button
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className="group relative flex items-center gap-1.5 px-2.5 py-1.5 rounded-full border border-slate-200 dark:border-white/[0.08] bg-white/80 dark:bg-white/[0.04] hover:bg-slate-100 dark:hover:bg-white/[0.08] text-slate-700 dark:text-slate-200 transition-all duration-300 shadow-sm active:scale-95"
      aria-label={`Switch to ${isDark ? "light" : "dark"} mode`}
      title={`Switch to ${isDark ? "light" : "dark"} mode`}
    >
      <div className="relative h-4 w-4 flex items-center justify-center">
        {isDark ? (
          <Sun className="h-3.5 w-3.5 text-amber-400 group-hover:rotate-45 transition-transform duration-300" />
        ) : (
          <Moon className="h-3.5 w-3.5 text-indigo-600 group-hover:-rotate-12 transition-transform duration-300" />
        )}
      </div>
      <span className="text-[11px] font-medium hidden sm:inline">
        {isDark ? "Light Mode" : "Dark Mode"}
      </span>
    </button>
  );
}
