"use client";

import { useState, useEffect } from "react";
import { Users, Upload, Search, CheckCircle, Clock, Plus, Globe } from "lucide-react";

export default function ApplicationsPage() {
  const [applications, setApplications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importText, setImportText] = useState("");
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    fetchApplications();
  }, []);

  async function fetchApplications() {
    setLoading(true);
    try {
      const res = await fetch("/api/applications");
      const data = await res.json();
      setApplications(data.applications || []);
    } catch (err) {
      console.error("Failed to load applications", err);
    } finally {
      setLoading(false);
    }
  }

  async function handleImport() {
    if (!importText.trim()) return;
    setImporting(true);

    try {
      let applicants = [];
      if (importText.trim().startsWith("[")) {
        applicants = JSON.parse(importText);
      } else {
        // Parse CSV lines
        const lines = importText.trim().split("\n");
        const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
        for (let i = 1; i < lines.length; i++) {
          const cols = lines[i].split(",").map((c) => c.trim());
          if (cols.length < 2) continue;
          applicants.push({
            name: cols[0],
            email: cols[1],
            skills: cols[2] || "General",
            rolePref: cols[3] || "Full Stack",
            timezone: parseInt(cols[4] || "0", 10),
          });
        }
      }

      const res = await fetch("/api/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          programId: applications[0]?.programId || "cmd_program",
          applicants,
        }),
      });

      if (res.ok) {
        setIsImportModalOpen(false);
        setImportText("");
        fetchApplications();
      }
    } catch (err) {
      alert("Error parsing or importing CSV/JSON: " + err);
    } finally {
      setImporting(false);
    }
  }

  const filtered = applications.filter(
    (app) =>
      app.participant?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      app.participant?.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      app.participant?.skills?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white flex items-center gap-2">
            <Users className="h-6 w-6 text-indigo-400" />
            Applications & Participant Roster
          </h1>
          <p className="text-xs text-slate-400">
            Ingest applicants, verify role allocations, inspect timezone distribution, and configure conflicts
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsImportModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs shadow-md shadow-indigo-600/20 transition-all"
          >
            <Upload className="h-4 w-4" />
            Import CSV / JSON
          </button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="glass-card p-4 flex items-center gap-3">
        <Search className="h-4 w-4 text-slate-400" />
        <input
          type="text"
          placeholder="Search by participant name, email, or skills..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="bg-transparent text-sm text-slate-200 placeholder-slate-500 w-full outline-none"
        />
        <span className="text-xs text-slate-500 font-mono shrink-0">
          Showing {filtered.length} of {applications.length}
        </span>
      </div>

      {/* Roster Table */}
      <div className="glass-card overflow-hidden">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-slate-800 bg-slate-900/50 text-slate-400 font-medium">
              <th className="p-3.5">Participant</th>
              <th className="p-3.5">Role Preference</th>
              <th className="p-3.5">Skills Profile</th>
              <th className="p-3.5">Timezone</th>
              <th className="p-3.5">Status</th>
              <th className="p-3.5">Submitted</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/80 text-slate-300">
            {loading ? (
              <tr>
                <td colSpan={6} className="p-8 text-center text-slate-500">
                  Loading participant records...
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-8 text-center text-slate-500">
                  No participants matched your search.
                </td>
              </tr>
            ) : (
              filtered.map((app) => (
                <tr key={app.id} className="hover:bg-slate-900/40 transition-colors">
                  <td className="p-3.5">
                    <div className="font-semibold text-white">{app.participant.name}</div>
                    <div className="text-[11px] text-slate-400">{app.participant.email}</div>
                  </td>
                  <td className="p-3.5">
                    <span className="px-2.5 py-1 rounded-md bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 font-medium text-[11px]">
                      {app.participant.rolePref}
                    </span>
                  </td>
                  <td className="p-3.5 max-w-xs">
                    <div className="flex flex-wrap gap-1">
                      {app.participant.skills.split(",").map((s: string, idx: number) => (
                        <span
                          key={idx}
                          className="px-1.5 py-0.5 rounded bg-slate-800 text-[10px] text-slate-300"
                        >
                          {s.trim()}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="p-3.5 font-mono text-[11px] text-slate-400">
                    <div className="flex items-center gap-1.5">
                      <Globe className="h-3 w-3 text-slate-500" />
                      UTC {app.participant.timezone >= 0 ? `+${app.participant.timezone}` : app.participant.timezone}
                    </div>
                  </td>
                  <td className="p-3.5">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      <CheckCircle className="h-3 w-3" />
                      {app.status}
                    </span>
                  </td>
                  <td className="p-3.5 text-slate-500 font-mono text-[11px]">
                    {new Date(app.submittedAt).toLocaleDateString()}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Import Modal */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
          <div className="glass-card max-w-xl w-full p-6 space-y-4 shadow-2xl border-indigo-500/30">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Upload className="h-5 w-5 text-indigo-400" />
              Batch Import Applicants (CSV or JSON)
            </h2>
            <p className="text-xs text-slate-400">
              Paste CSV with format: <code>name, email, skills, rolePref, timezone</code> or JSON array of objects.
            </p>

            <textarea
              rows={8}
              className="w-full rounded-xl bg-slate-900 border border-slate-700 p-3 font-mono text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
              placeholder={`name, email, skills, rolePref, timezone
Amina Bello, amina@lagos.ai, Python; PyTorch; NLP, ML Engineer, 1
Liam Scott, liam@edinburgh.uk, Rust; Systems; Go, Systems Lead, 0`}
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
            />

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setIsImportModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleImport}
                disabled={importing || !importText.trim()}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs shadow-md shadow-indigo-600/30 disabled:opacity-50"
              >
                {importing ? "Importing..." : "Process & Import"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
