import type { Metadata } from "next";
import "./globals.css";
import Navbar from "@/components/Navbar";

export const metadata: Metadata = {
  title: "CommunityOps — Fair, Auditable, Repeatable Operations",
  description:
    "Operations platform for hackathons, cohorts, accelerators, and community programs with normalization, constrained optimization, transactional outbox, verifiable certificates, and approval gates.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="bg-slate-950 text-slate-100 antialiased min-h-screen flex flex-col selection:bg-indigo-500/30 selection:text-indigo-200">
        <Navbar />
        <main className="flex-1 max-w-7xl w-full mx-auto p-6 md:p-8">
          {children}
        </main>
        <footer className="border-t border-slate-800/80 py-6 text-center text-xs text-slate-500">
          <p>
            CommunityOps v1.0 • Built with Next.js, Prisma, OR-Tools CP-SAT, Transactional Outbox & Ed25519 Cryptography.
          </p>
        </footer>
      </body>
    </html>
  );
}
