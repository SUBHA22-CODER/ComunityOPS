import * as React from "react";
import { cn } from "@/lib/utils";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "secondary" | "outline" | "ghost" | "destructive" | "pill";
  size?: "default" | "sm" | "lg" | "icon";
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", ...props }, ref) => {
    const baseStyles =
      "inline-flex items-center justify-center whitespace-nowrap rounded-xl text-xs font-medium transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98]";

    const variantStyles = {
      default:
        "bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600 text-white shadow-[0_0_24px_-4px_rgba(99,102,241,0.5)] hover:shadow-[0_0_32px_-4px_rgba(99,102,241,0.7)] hover:from-indigo-500 hover:to-purple-500",
      secondary:
        "bg-white/[0.05] hover:bg-white/[0.1] text-slate-200 border border-white/[0.08]",
      outline:
        "border border-white/[0.12] bg-transparent hover:bg-white/[0.04] text-slate-200",
      ghost:
        "hover:bg-white/[0.06] text-slate-300 hover:text-white",
      destructive:
        "bg-rose-600 hover:bg-rose-500 text-white shadow-[0_0_20px_rgba(244,63,94,0.3)]",
      pill:
        "rounded-full pl-5 pr-2 py-2 bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-[0_0_25px_rgba(99,102,241,0.4)] hover:shadow-[0_0_35px_rgba(99,102,241,0.6)]",
    };

    const sizeStyles = {
      default: "h-9 px-4 py-2",
      sm: "h-8 rounded-lg px-3 text-[11px]",
      lg: "h-11 rounded-2xl px-6 text-sm",
      icon: "h-9 w-9",
    };

    return (
      <button
        ref={ref}
        className={cn(baseStyles, variantStyles[variant], sizeStyles[size], className)}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button };
