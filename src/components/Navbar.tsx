"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ShieldCheck,
  Users,
  Award,
  Send,
  Scale,
  FileCheck,
  CheckCircle2,
  Activity,
  Layers,
} from "lucide-react";

export default function Navbar() {
  const pathname = usePathname();

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
    <nav className="sticky top-0 z-50 glass border-b border-slate-800 px-6 py-3">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-purple-500 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20 group-hover:scale-105 transition-transform">
              <Scale className="h-5 w-5" />
            </div>
            <div>
              <span className="font-bold text-lg text-white tracking-tight flex items-center gap-2">
                CommunityOps
                <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                  v1.0
                </span>
              </span>
              <p className="text-[11px] text-slate-400 -mt-0.5">High-Stakes Operations Platform</p>
            </div>
          </Link>

          {/* Active Cohort Switcher */}
          <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900/80 border border-slate-800 text-xs">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-slate-400">Active Cohort:</span>
            <span className="text-slate-200 font-medium">Global AI Hackathon 2026</span>
          </div>
        </div>

        {/* Links */}
        <div className="flex items-center gap-1.5 overflow-x-auto py-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  isActive
                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
