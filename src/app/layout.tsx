import type { Metadata } from "next";
import "./globals.css";
import Navbar from "@/components/Navbar";

export const metadata: Metadata = {
  title: "CommunityOps — Fair, Auditable, Repeatable Operations",
  description:
    "Operations platform for hackathons, cohorts, accelerators, and community programs with normalization, constrained optimization, transactional outbox, verifiable certificates, and approval gates.",
};

import { ThemeProvider } from "@/components/ThemeProvider";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="bg-slate-50 dark:bg-[#06070a] text-slate-900 dark:text-slate-100 antialiased min-h-screen flex flex-col selection:bg-indigo-500/20 selection:text-indigo-600 dark:selection:bg-indigo-500/30 dark:selection:text-indigo-200 transition-colors duration-300">
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
          <Navbar />
          <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 md:p-8">
            {children}
          </main>
          <footer className="border-t border-slate-200 dark:border-white/[0.06] py-6 text-center text-xs text-slate-500 dark:text-slate-500 transition-colors">
            <p>
              CommunityOps • Fair, Auditable, Repeatable Operations for Hackathons & Cohorts.
            </p>
          </footer>
        </ThemeProvider>
      </body>
    </html>
  );
}
