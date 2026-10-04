"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  ShieldCheck,
  Users,
  Award,
  Send,
  Scale,
  Activity,
  Layers,
  Sparkles,
  Menu,
  X,
  ArrowUpRight,
} from "lucide-react";
import { ThemeToggle } from "./ThemeToggle";

export default function Navbar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const navItems = [
    { name: "Overview", href: "/", icon: Activity },
    { name: "Applications", href: "/applications", icon: Users },
    { name: "Teams & Mentors", href: "/teams", icon: Layers },
    { name: "Judging Engine", href: "/judging", icon: Scale },
    { name: "Communications", href: "/communications", icon: Send },
    { name: "Certificates", href: "/certificates", icon: Award },
    { name: "Approvals & Audit", href: "/approvals", icon: ShieldCheck },
  ];

  return (
    <header className="sticky top-0 z-50 px-4 pt-3 pb-2 transition-all">
      {/* Apple-style Frosted Glass Capsule */}
      <div className="max-w-6xl mx-auto rounded-full apple-glass px-4 py-2 shadow-sm flex items-center justify-between transition-all duration-300">
        {/* Brand */}
        <Link href="/" className="flex items-center gap-2.5 pl-2 group">
          <div className="h-8 w-8 rounded-full bg-blue-600 dark:bg-blue-500 flex items-center justify-center text-white shadow-md shadow-blue-500/20 group-hover:scale-105 transition-transform">
            <Scale className="h-4 w-4" />
          </div>
          <span className="font-bold text-sm tracking-tight text-[#1d1d1f] dark:text-[#f5f5f7] flex items-center gap-1.5">
            CommunityOps
            <span className="text-[9px] font-semibold px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border border-blue-200/60 dark:border-blue-500/30">
              Pro
            </span>
          </span>
        </Link>

        {/* Desktop Nav Items */}
        <nav className="hidden lg:flex items-center gap-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`relative px-3.5 py-1.5 rounded-full text-xs font-medium transition-all duration-200 flex items-center gap-1.5 ${
                  isActive
                    ? "text-blue-600 dark:text-white bg-blue-50/80 dark:bg-white/10 font-semibold shadow-xs"
                    : "text-[#6e6e73] dark:text-[#86868b] hover:text-[#1d1d1f] dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5"
                }`}
              >
                <Icon className={`h-3.5 w-3.5 ${isActive ? "text-blue-600 dark:text-blue-400" : ""}`} />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>

        {/* Right Controls: Theme Toggle + Quick Pipeline Button */}
        <div className="hidden sm:flex items-center gap-2 pr-1">
          <ThemeToggle />

          <Link
            href="/judging"
            className="apple-btn-primary px-3.5 py-1.5 text-xs inline-flex items-center gap-1.5 shadow-sm"
          >
            <span>Run Pipeline</span>
            <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {/* Mobile Hamburger Button */}
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="lg:hidden p-2 rounded-full text-[#6e6e73] dark:text-[#86868b] hover:text-[#1d1d1f] dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
          aria-label="Toggle Navigation"
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileOpen && (
        <div className="lg:hidden mt-2 max-w-6xl mx-auto rounded-3xl apple-glass p-4 shadow-xl border border-black/10 dark:border-white/10 animate-in-fluid">
          <div className="flex flex-col gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center justify-between px-4 py-3 rounded-2xl text-xs font-medium transition-all ${
                    isActive
                      ? "bg-blue-50 dark:bg-white/10 text-blue-600 dark:text-white font-semibold"
                      : "text-[#6e6e73] dark:text-[#86868b] hover:text-[#1d1d1f] dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    <span>{item.name}</span>
                  </div>
                  <ArrowUpRight className="h-3.5 w-3.5 opacity-40" />
                </Link>
              );
            })}
            <div className="pt-2 flex items-center justify-between border-t border-black/5 dark:border-white/10 mt-2 px-2">
              <span className="text-xs text-[#6e6e73] dark:text-[#86868b]">Appearance</span>
              <ThemeToggle />
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
