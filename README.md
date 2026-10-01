# CommunityOps

> **Make high-stakes community operations fair, auditable, and repeatable without scaling headcount.**

CommunityOps is an operations platform built for hackathons, cohorts, accelerators, grants, and community programs. It manages applications, team formation, mentor matching, judging, results, bulk communications, certificates, approvals, and audit trails.

---

## 🏛 The Five High-Ceiling Technical Pillars

1. **Judging Engine with Bias Normalization & Explainability**
   - **Formula:** $z_{j,c} = \frac{x_{j,c} - \mu_{j,c}}{\sigma_{j,c}}$ per judge $j$ and criterion $c$.
   - Rubric weighting: $S = \sum w_c \cdot z_{j,c}$.
   - Detects and handles zero variance ($\sigma = 0$) and flags low-confidence judging.
   - Automated Conflict of Interest (COI) filtering (same organization, prior mentorship, teammate).
   - Explainable scorecard API: `GET /api/submissions/:id/scorecard` displaying full mathematical breakdowns.

2. **Team Formation & Mentor Matching (Constrained Optimization)**
   - Form balanced teams maximizing skill entropy and role diversity while minimizing timezone spread and respecting conflict pairs.
   - Dual-engine: Python **OR-Tools CP-SAT** FastAPI microservice (`services/optimizer`) + embedded high-performance constraint optimizer fallback in TypeScript.
   - Bipartite mentor matching using the Hungarian algorithm to minimize tech mismatch and timezone delta under capacity limits.

3. **Transactional Outbox Pattern for Bulk Communication**
   - Atomically writes domain changes and `outbox_events` in the same transaction.
   - Idempotent execution via unique `idempotency_key`.
   - Exponential backoff retry queue with dead letter queue (DLQ) after max attempts.
   - Channel adapters for Email (Resend/SendGrid/SES simulator) and Discord (Webhooks/Bot).

4. **Verifiable Certificates (Ed25519 Cryptography)**
   - UUIDv7 / base58 check certificate identifiers.
   - Signed with Ed25519 private keys over deterministic canonical JSON payloads.
   - Real-time cryptographic validation on public verification endpoint (`GET /verify/:certId` & `/api/verify/:certId`) without trusting a database alone.
   - Key rotation support and revocation lists.

5. **Approval Gates on Irreversible Actions**
   - Guards high-risk irreversible actions: **Publish Teams**, **Publish Results**, **Bulk Send**, and **Issue Certificates**.
   - Generates dry-run snapshot diffs for reviewer inspection.
   - Strict state machine: `pending` → `approved` / `rejected` / `expired` → `executed`.
   - Append-only immutable audit trail (`audit_logs`).

---

## 🚀 Quick Start Guide

### 1. Prerequisites
- **Node.js**: v18+ (tested on Node v24)
- **npm**: v9+
- *(Optional)* Python 3.11+ (for standalone OR-Tools worker) or Docker

### 2. Setup & Installation
```bash
# 1. Install dependencies
npm install

# 2. Push database schema (SQLite locally, zero-config)
npm run db:push

# 3. Seed with realistic hackathon scenario (judges, teams, scores, approvals)
npm run db:seed

# 4. Start the local server
npm run dev
```

The application is now live at [http://localhost:3000](http://localhost:3000).

---

## 🧪 Validating the 5 Pillars

Run the built-in test suite to verify all mathematical formulas and cryptographic proofs:
```bash
npx tsx scripts/test-pillars.mjs
```

Expected output:
```
=== Testing 5 High-Ceiling Technical Pillars ===
✔ SUCCESS: Judge A top score and Judge B top score calibrated to identical Z-Score (+1.225)!
✔ SUCCESS: Ed25519 Cryptographic Signature Verified
✔ SUCCESS: Tampered Payload Rejected
✔ SUCCESS: Constraint Team Optimizer Formed Balanced Teams
✔ SUCCESS: Bipartite Hungarian Mentor Allocator Assigned Mentors
=== All 5 Pillar Validations Passed! ===
```

---

## 🌐 Application Routes

| Route | Purpose |
|---|---|
| `/` | Executive Dashboard: KPI cards, pillar status, and recent audit activity |
| `/applications` | Applicant roster, timezone distribution, and CSV/JSON batch import |
| `/teams` | Constraint solver interface, live dry-run previews, and mentor matching |
| `/judging` | Rubrics, judge severity stats, Z-score computation, and explainable scorecards |
| `/communications` | Transactional outbox hub, email/Discord campaigns, and worker controls |
| `/certificates` | Issued certificates table, Ed25519 key viewer, and revocation tools |
| `/verify/:certId` | Public verification page with live cryptographic Ed25519 signature validation |
| `/approvals` | Approval gates inspector, dry-run diff viewer, and immutable audit logs |

---

## 🛠 Tech Stack

- **Framework**: Next.js 15 (App Router, React 19, Tailwind CSS)
- **Database & ORM**: SQLite / PostgreSQL with Prisma Client
- **Cryptography**: Native Node.js `crypto` with Ed25519 keypairs & SHA-256 canonical hashing
- **Constraint Optimization**: Python OR-Tools CP-SAT + TypeScript heuristic solver
- **Messaging**: Transactional Outbox pattern with rate limiting & exponential backoff
