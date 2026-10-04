import * as React from "react";
import { cn } from "@/lib/utils";

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "secondary" | "destructive" | "outline" | "glow" | "emerald" | "amber";
}

function Badge({ className, variant = "default", ...props }: BadgeProps) {
  const variantStyles = {
    default: "bg-indigo-500/10 text-indigo-300 border-indigo-500/20 hover:bg-indigo-500/20",
    secondary: "bg-white/[0.05] text-slate-300 border-white/[0.08] hover:bg-white/[0.08]",
    destructive: "bg-rose-500/10 text-rose-300 border-rose-500/20 hover:bg-rose-500/20",
    outline: "text-slate-300 border-white/[0.12] hover:bg-white/[0.04]",
    glow: "bg-gradient-to-r from-indigo-500/15 via-purple-500/15 to-pink-500/15 text-indigo-200 border-indigo-500/30 shadow-[0_0_15px_-3px_rgba(99,102,241,0.3)]",
    emerald: "bg-emerald-500/10 text-emerald-300 border-emerald-500/20 shadow-[0_0_15px_-3px_rgba(16,185,129,0.25)]",
    amber: "bg-amber-500/10 text-amber-300 border-amber-500/20 shadow-[0_0_15px_-3px_rgba(245,158,11,0.25)]",
  };

  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-mono font-medium transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/50",
        variantStyles[variant],
        className
      )}
      {...props}
    />
  );
}

export { Badge };
