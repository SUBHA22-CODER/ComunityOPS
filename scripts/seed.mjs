import { PrismaClient } from "@prisma/client";
import crypto from "crypto";
import fs from "fs";
import path from "path";

const prisma = new PrismaClient();

function hashEmail(email) {
  return crypto.createHash("sha256").update(email.trim().toLowerCase()).digest("hex");
}

function canonicalizeJson(obj) {
  if (obj === null || typeof obj !== "object") return JSON.stringify(obj);
  if (Array.isArray(obj)) return "[" + obj.map(canonicalizeJson).join(",") + "]";
  const keys = Object.keys(obj).sort();
  return "{" + keys.map((k) => JSON.stringify(k) + ":" + canonicalizeJson(obj[k])).join(",") + "}";
}

async function main() {
  console.log("Seeding CommunityOps database...");

  // Clear existing data
  await prisma.auditLog.deleteMany();
  await prisma.approval.deleteMany();
  await prisma.certificateRevocation.deleteMany();
  await prisma.certificate.deleteMany();
  await prisma.messageDelivery.deleteMany();
  await prisma.outboxEvent.deleteMany();
  await prisma.commCampaign.deleteMany();
  await prisma.commTemplate.deleteMany();
  await prisma.result.deleteMany();
  await prisma.normalizedScore.deleteMany();
  await prisma.score.deleteMany();
  await prisma.conflictOfInterest.deleteMany();
  await prisma.judgeAssignment.deleteMany();
  await prisma.criterion.deleteMany();
  await prisma.rubric.deleteMany();
  await prisma.submission.deleteMany();
  await prisma.mentorAssignment.deleteMany();
  await prisma.mentor.deleteMany();
  await prisma.teamMember.deleteMany();
  await prisma.team.deleteMany();
  await prisma.applicationAnswer.deleteMany();
  await prisma.application.deleteMany();
  await prisma.participant.deleteMany();
  await prisma.programMember.deleteMany();
  await prisma.program.deleteMany();
  await prisma.user.deleteMany();
  await prisma.role.deleteMany();

  // 1. Roles
  await prisma.role.createMany({
    data: [
      { name: "ADMIN", description: "Full system administration", permissions: JSON.stringify(["*"]) },
      { name: "PROGRAM_MANAGER", description: "Manages cohorts, judging, and comms", permissions: JSON.stringify(["program:write", "teams:publish", "results:publish", "comms:send"]) },
      { name: "JUDGE", description: "Scores submissions", permissions: JSON.stringify(["scores:write", "scores:read"]) },
      { name: "MENTOR", description: "Advises teams", permissions: JSON.stringify(["teams:read"]) },
      { name: "PARTICIPANT", description: "Submits projects and applications", permissions: JSON.stringify(["submission:write"]) },
    ],
  });

  // 2. Users
  const admin = await prisma.user.create({
    data: {
      email: "admin@communityops.org",
      name: "Alex Vance (Admin)",
      systemRole: "ADMIN",
    },
  });

  const pm = await prisma.user.create({
    data: {
      email: "elena@communityops.org",
      name: "Elena Rostova",
      systemRole: "PROGRAM_MANAGER",
    },
  });

  const judge1 = await prisma.user.create({
    data: {
      email: "judge.chen@mit.edu",
      name: "Prof. Sarah Chen",
      systemRole: "JUDGE",
    },
  });

  const judge2 = await prisma.user.create({
    data: {
      email: "marcus.brody@sequoia.com",
      name: "Marcus Brody",
      systemRole: "JUDGE",
    },
  });

  const judge3 = await prisma.user.create({
    data: {
      email: "aris.vance@deepmind.com",
      name: "Dr. Aris Vance",
      systemRole: "JUDGE",
    },
  });

  // 3. Program
  const program = await prisma.program.create({
    data: {
      name: "Global Autonomous AI Hackathon 2026",
      slug: "global-ai-2026",
      description: "A premier 48-hour global hackathon building resilient AI agents and decentralized protocols.",
      status: "ACTIVE",
      teamSizeMin: 3,
      teamSizeMax: 4,
      startDate: new Date("2026-10-15T09:00:00Z"),
      endDate: new Date("2026-10-17T18:00:00Z"),
    },
  });

  await prisma.programMember.createMany({
    data: [
      { programId: program.id, userId: admin.id, role: "ADMIN" },
      { programId: program.id, userId: pm.id, role: "PROGRAM_MANAGER" },
      { programId: program.id, userId: judge1.id, role: "JUDGE" },
      { programId: program.id, userId: judge2.id, role: "JUDGE" },
      { programId: program.id, userId: judge3.id, role: "JUDGE" },
    ],
  });

  // 4. Participants
  const participantsData = [
    { name: "Devon Reed", email: "devon@hey.com", skills: "React, Next.js, TypeScript, UI/UX", rolePref: "Frontend Lead", timezone: -5 },
    { name: "Priya Sharma", email: "priya.ai@gmail.com", skills: "Python, PyTorch, LangChain, FastAPI", rolePref: "ML Engineer", timezone: 5 },
    { name: "Lukas Weber", email: "lukas@berlin.de", skills: "Rust, Postgres, Docker, Go", rolePref: "Systems Engineer", timezone: 1 },
    { name: "Ananya Iyer", email: "ananya.iyer@gatech.edu", skills: "Full Stack, Node.js, GraphQL, React", rolePref: "Full Stack", timezone: -4 },
    { name: "Carlos Mendez", email: "carlos.m@sol.org", skills: "Solidity, Web3, Smart Contracts, Rust", rolePref: "Smart Contracts", timezone: -7 },
    { name: "Zoe Dubois", email: "zoe@designcraft.fr", skills: "Figma, UI/UX, Product Strategy, CSS", rolePref: "Product Designer", timezone: 2 },
    { name: "Kenji Sato", email: "kenji@tokyo.ac.jp", skills: "Computer Vision, Python, ONNX, C++", rolePref: "ML Engineer", timezone: 9 },
    { name: "Tariq Al-Mansoor", email: "tariq@cloudops.io", skills: "Kubernetes, Redis, Terraform, AWS", rolePref: "DevOps / Infra", timezone: 4 },
    { name: "Maya Patel", email: "maya@mit.edu", skills: "Next.js, Tailwind, Prisma, TypeScript", rolePref: "Frontend Lead", timezone: -5 },
    { name: "David Kim", email: "david.kim@seoul.kr", skills: "NLP, Transformers, RAG, Python", rolePref: "ML Engineer", timezone: 9 },
    { name: "Sofia Rossi", email: "sofia@milan.it", skills: "Vue, React, Product Management, UI", rolePref: "Full Stack", timezone: 1 },
    { name: "Liam O'Connor", email: "liam@dublin.ie", skills: "Go, Distributed Systems, Redis, Kafka", rolePref: "Backend Lead", timezone: 0 },
  ];

  const participants = [];
  for (const p of participantsData) {
    const part = await prisma.participant.create({
      data: {
        programId: program.id,
        name: p.name,
        email: p.email,
        skills: p.skills,
        rolePref: p.rolePref,
        timezone: p.timezone,
        status: "ACTIVE",
      },
    });
    participants.push(part);

    const app = await prisma.application.create({
      data: {
        programId: program.id,
        participantId: part.id,
        status: "ACCEPTED",
      },
    });

    await prisma.applicationAnswer.create({
      data: {
        applicationId: app.id,
        questionKey: "portfolio_url",
        answerValue: `https://github.com/${p.name.toLowerCase().replace(/[^a-z]/g, "")}`,
      },
    });
  }

  // 5. Mentors
  const mentor1 = await prisma.mentor.create({
    data: {
      programId: program.id,
      name: "Dr. Vikram Seth",
      email: "vikram@aiventures.io",
      expertise: "LangChain, PyTorch, Agentic Workflows, Scalability",
      capacity: 2,
      timezone: 5,
    },
  });

  const mentor2 = await prisma.mentor.create({
    data: {
      programId: program.id,
      name: "Hannah Schmidt",
      email: "hannah@crypto-labs.eth",
      expertise: "Solidity, Rust, Distributed Systems, Architecture",
      capacity: 2,
      timezone: 1,
    },
  });

  // 6. Teams
  const team1 = await prisma.team.create({
    data: {
      programId: program.id,
      name: "NexusAgent",
      status: "PUBLISHED",
      techStack: "PyTorch, FastAPI, Next.js, Redis",
      timezoneAvg: 0.33,
      optimizerNotes: "Formed via OR-Tools CP-SAT: optimal skill coverage (ML + Frontend + Systems).",
    },
  });

  await prisma.teamMember.createMany({
    data: [
      { teamId: team1.id, participantId: participants[0].id, role: "Frontend Lead", isLead: true },
      { teamId: team1.id, participantId: participants[1].id, role: "ML Engineer", isLead: false },
      { teamId: team1.id, participantId: participants[2].id, role: "Systems Engineer", isLead: false },
    ],
  });

  const team2 = await prisma.team.create({
    data: {
      programId: program.id,
      name: "ZeroRoute",
      status: "PUBLISHED",
      techStack: "Solidity, Rust, Web3, React",
      timezoneAvg: -3.0,
      optimizerNotes: "Formed via OR-Tools CP-SAT: high role diversity.",
    },
  });

  await prisma.teamMember.createMany({
    data: [
      { teamId: team2.id, participantId: participants[3].id, role: "Full Stack", isLead: false },
      { teamId: team2.id, participantId: participants[4].id, role: "Smart Contracts", isLead: true },
      { teamId: team2.id, participantId: participants[5].id, role: "Product Designer", isLead: false },
    ],
  });

  const team3 = await prisma.team.create({
    data: {
      programId: program.id,
      name: "PulseVision",
      status: "PUBLISHED",
      techStack: "Computer Vision, Python, C++, Next.js",
      timezoneAvg: 6.5,
      optimizerNotes: "Formed via OR-Tools CP-SAT: complementary timezone & vision AI expertise.",
    },
  });

  await prisma.teamMember.createMany({
    data: [
      { teamId: team3.id, participantId: participants[6].id, role: "ML Engineer", isLead: true },
      { teamId: team3.id, participantId: participants[7].id, role: "DevOps / Infra", isLead: false },
      { teamId: team3.id, participantId: participants[8].id, role: "Frontend Lead", isLead: false },
    ],
  });

  // Mentor Matches
  await prisma.mentorAssignment.createMany({
    data: [
      {
        programId: program.id,
        teamId: team1.id,
        mentorId: mentor1.id,
        matchScore: 94.0,
        explainability: "94% tech stack overlap (PyTorch/Agents), optimal timezone alignment.",
        status: "CONFIRMED",
      },
      {
        programId: program.id,
        teamId: team2.id,
        mentorId: mentor2.id,
        matchScore: 91.5,
        explainability: "91% tech stack overlap (Solidity/Rust), high domain resonance.",
        status: "CONFIRMED",
      },
    ],
  });

  // 7. Submissions
  const sub1 = await prisma.submission.create({
    data: {
      programId: program.id,
      teamId: team1.id,
      title: "NexusAgent: Autonomous Self-Healing DevOps Assistant",
      description: "An agentic cluster manager that intercepts Kubernetes anomalies and crafts verified auto-remediation PRs.",
      repoUrl: "https://github.com/nexus-agent/nexus-core",
      demoUrl: "https://nexusagent.dev",
      isLocked: true,
    },
  });

  const sub2 = await prisma.submission.create({
    data: {
      programId: program.id,
      teamId: team2.id,
      title: "ZeroRoute: Privacy-Preserving Cross-Chain Liquidity",
      description: "Decentralized atomic settlement network using zero-knowledge recursive SNARKs.",
      repoUrl: "https://github.com/zeroroute/protocol",
      demoUrl: "https://zeroroute.network",
      isLocked: true,
    },
  });

  const sub3 = await prisma.submission.create({
    data: {
      programId: program.id,
      teamId: team3.id,
      title: "PulseVision: Ultra-Low-Latency Edge Ultrasound Diagnostics",
      description: "Real-time edge neural inference for emergency medical ultrasound triage in disconnected environments.",
      repoUrl: "https://github.com/pulsevision/edge-ai",
      demoUrl: "https://pulsevision.app",
      isLocked: true,
    },
  });

  // 8. Rubrics & Criteria
  const rubric = await prisma.rubric.create({
    data: {
      programId: program.id,
      name: "Standard Innovation & Technical Rubric v1",
      version: 1,
      isDefault: true,
    },
  });

  const crit1 = await prisma.criterion.create({
    data: { rubricId: rubric.id, name: "Technical Depth & Architecture", weight: 0.35, maxScore: 10 },
  });
  const crit2 = await prisma.criterion.create({
    data: { rubricId: rubric.id, name: "Innovation & Originality", weight: 0.30, maxScore: 10 },
  });
  const crit3 = await prisma.criterion.create({
    data: { rubricId: rubric.id, name: "Real-World Impact & Utility", weight: 0.20, maxScore: 10 },
  });
  const crit4 = await prisma.criterion.create({
    data: { rubricId: rubric.id, name: "Execution, Polish & Demo", weight: 0.15, maxScore: 10 },
  });

  // 9. Conflict of Interest Check
  // Judge Dr. Aris Vance has prior advisory role with ZeroRoute's Carlos Mendez
  await prisma.conflictOfInterest.create({
    data: {
      programId: program.id,
      judgeId: judge3.id,
      teamId: team2.id,
      reason: "Prior academic mentorship with team member Carlos Mendez",
      status: "ACTIVE",
    },
  });

  // 10. Judge Assignments & Raw Scores
  // Judge 1 (Sarah Chen: calibrated/moderate)
  // Judge 2 (Marcus Brody: tough judge, lower average)
  // Judge 3 (Aris Vance: generous judge, higher average)
  const scoresData = [
    // Sarah Chen judging Sub 1
    { judgeId: judge1.id, subId: sub1.id, critId: crit1.id, score: 9.0, comment: "Superb architecture and error handling." },
    { judgeId: judge1.id, subId: sub1.id, critId: crit2.id, score: 8.5, comment: "Creative use of agent loops." },
    { judgeId: judge1.id, subId: sub1.id, critId: crit3.id, score: 8.0, comment: "High business value." },
    { judgeId: judge1.id, subId: sub1.id, critId: crit4.id, score: 9.0, comment: "Polished dashboard demo." },

    // Sarah Chen judging Sub 2
    { judgeId: judge1.id, subId: sub2.id, critId: crit1.id, score: 9.5, comment: "Deep math in ZK proof circuits." },
    { judgeId: judge1.id, subId: sub2.id, critId: crit2.id, score: 9.0, comment: "Novel state compression." },
    { judgeId: judge1.id, subId: sub2.id, critId: crit3.id, score: 7.5, comment: "Requires ecosystem adoption." },
    { judgeId: judge1.id, subId: sub2.id, critId: crit4.id, score: 8.0, comment: "Clean CLI demo." },

    // Sarah Chen judging Sub 3
    { judgeId: judge1.id, subId: sub3.id, critId: crit1.id, score: 8.0, comment: "Good edge quantization." },
    { judgeId: judge1.id, subId: sub3.id, critId: crit2.id, score: 8.5, comment: "Inspiring healthcare angle." },
    { judgeId: judge1.id, subId: sub3.id, critId: crit3.id, score: 9.5, comment: "Life saving potential." },
    { judgeId: judge1.id, subId: sub3.id, critId: crit4.id, score: 8.0, comment: "Functional hardware prototype." },

    // Marcus Brody (Harsh judge) judging Sub 1
    { judgeId: judge2.id, subId: sub1.id, critId: crit1.id, score: 7.5, comment: "Good, but needs security audit." },
    { judgeId: judge2.id, subId: sub1.id, critId: crit2.id, score: 7.0, comment: "Several competitors exist." },
    { judgeId: judge2.id, subId: sub1.id, critId: crit3.id, score: 7.0, comment: "B2B SaaS focus." },
    { judgeId: judge2.id, subId: sub1.id, critId: crit4.id, score: 7.5, comment: "Solid presentation." },

    // Marcus Brody judging Sub 2
    { judgeId: judge2.id, subId: sub2.id, critId: crit1.id, score: 8.5, comment: "Impressive cryptographic soundness." },
    { judgeId: judge2.id, subId: sub2.id, critId: crit2.id, score: 8.0, comment: "Novel SNARK setup." },
    { judgeId: judge2.id, subId: sub2.id, critId: crit3.id, score: 6.5, comment: "Gas costs are a bottleneck." },
    { judgeId: judge2.id, subId: sub2.id, critId: crit4.id, score: 7.0, comment: "Good deck." },

    // Marcus Brody judging Sub 3
    { judgeId: judge2.id, subId: sub3.id, critId: crit1.id, score: 7.0, comment: "Model latency on Raspberry Pi is high." },
    { judgeId: judge2.id, subId: sub3.id, critId: crit2.id, score: 7.5, comment: "Great clinical workflow." },
    { judgeId: judge2.id, subId: sub3.id, critId: crit3.id, score: 8.5, comment: "Strong humanitarian application." },
    { judgeId: judge2.id, subId: sub3.id, critId: crit4.id, score: 6.5, comment: "Needs better UI." },

    // Dr. Aris Vance (Generous judge) judging Sub 1
    { judgeId: judge3.id, subId: sub1.id, critId: crit1.id, score: 9.5, comment: "Phenomenal agent design!" },
    { judgeId: judge3.id, subId: sub1.id, critId: crit2.id, score: 9.5, comment: "Groundbreaking autonomy." },
    { judgeId: judge3.id, subId: sub1.id, critId: crit3.id, score: 9.0, comment: "Immediate enterprise utility." },
    { judgeId: judge3.id, subId: sub1.id, critId: crit4.id, score: 9.5, comment: "Best demo of the event." },

    // (Note: Judge 3 COI on Sub 2 excluded!)
    // Dr. Aris Vance judging Sub 3
    { judgeId: judge3.id, subId: sub3.id, critId: crit1.id, score: 9.0, comment: "Superb quantized inference." },
    { judgeId: judge3.id, subId: sub3.id, critId: crit2.id, score: 9.5, comment: "Truly empathetic invention." },
    { judgeId: judge3.id, subId: sub3.id, critId: crit3.id, score: 10.0, comment: "Transformative impact." },
    { judgeId: judge3.id, subId: sub3.id, critId: crit4.id, score: 9.0, comment: "Very moving live demo." },
  ];

  for (const s of scoresData) {
    await prisma.score.create({
      data: {
        judgeId: s.judgeId,
        submissionId: s.subId,
        criterionId: s.critId,
        rawScore: s.score,
        comment: s.comment,
      },
    });
  }

  // 11. Initial Results Calculation
  await prisma.result.createMany({
    data: [
      { programId: program.id, submissionId: sub1.id, rawTotal: 8.63, normalizedTotal: 1.142, rank: 1, isPublished: false },
      { programId: program.id, submissionId: sub3.id, rawTotal: 8.42, normalizedTotal: 0.985, rank: 2, isPublished: false },
      { programId: program.id, submissionId: sub2.id, rawTotal: 8.00, normalizedTotal: 0.724, rank: 3, isPublished: false },
    ],
  });

  // 12. Verifiable Certificates (Ed25519)
  let keypair;
  const keyDir = path.resolve(process.cwd(), ".keys");
  const keyFile = path.join(keyDir, "ed25519-ca.json");
  if (fs.existsSync(keyFile)) {
    keypair = JSON.parse(fs.readFileSync(keyFile, "utf8"));
  } else {
    const { publicKey, privateKey } = crypto.generateKeyPairSync("ed25519", {
      publicKeyEncoding: { type: "spki", format: "pem" },
      privateKeyEncoding: { type: "pkcs8", format: "pem" },
    });
    keypair = { publicKey, privateKey };
    if (!fs.existsSync(keyDir)) fs.mkdirSync(keyDir, { recursive: true });
    fs.writeFileSync(keyFile, JSON.stringify(keypair, null, 2), "utf8");
  }

  const certData = {
    cert_id: "COPS_HACK26_WIN01",
    recipient_name: "Devon Reed",
    recipient_email_hash: hashEmail("devon@hey.com"),
    program: "Global Autonomous AI Hackathon 2026",
    role: "winner",
    issued_at: new Date().toISOString(),
    template_version: "1.0",
    revoked: false,
  };

  const canonicalPayload = canonicalizeJson(certData);
  const sig = crypto.sign(null, Buffer.from(canonicalPayload, "utf8"), keypair.privateKey).toString("hex");

  await prisma.certificate.create({
    data: {
      programId: program.id,
      certId: "COPS_HACK26_WIN01",
      recipientName: "Devon Reed",
      recipientEmailHash: certData.recipient_email_hash,
      role: "winner",
      signature: sig,
      canonicalPayload,
      isRevoked: false,
    },
  });

  // 13. Comm Campaign & Outbox
  const campaign = await prisma.commCampaign.create({
    data: {
      programId: program.id,
      name: "Hackathon Results Announcement & Certificate Distribution",
      channel: "EMAIL",
      subject: "Global AI Hackathon 2026: Official Results & Certificates",
      body: "Hello {{name}},\n\nThank you for participating in the 2026 Global AI Hackathon. Your verifiable completion certificate is now available.",
      status: "COMPLETED",
      totalRecipients: 12,
      sentCount: 12,
      failedCount: 0,
      idempotencyKey: "camp_results_2026_10_01",
    },
  });

  // 14. Pending Approval Gate (Publish Results)
  await prisma.approval.create({
    data: {
      programId: program.id,
      actionType: "PUBLISH_RESULTS",
      targetType: "Result",
      targetId: program.id,
      requestedBy: pm.id,
      status: "pending",
      diff: JSON.stringify({
        action: "Publish Final Leaderboard & Notify Teams",
        teamsRanked: 3,
        topRank: "NexusAgent (Score: 1.142 normalized)",
        coiExcluded: ["Dr. Aris Vance excluded from ZeroRoute"],
      }),
      idempotencyKey: `appr_pub_results_${program.id}`,
    },
  });

  // 15. Audit Log Initial Records
  await prisma.auditLog.createMany({
    data: [
      {
        programId: program.id,
        actorId: admin.id,
        action: "PROGRAM_INITIALIZED",
        targetType: "Program",
        targetId: program.id,
        diff: JSON.stringify({ name: program.name, slug: program.slug }),
      },
      {
        programId: program.id,
        actorId: pm.id,
        action: "TEAMS_OPTIMIZED_AND_PUBLISHED",
        targetType: "Team",
        targetId: program.id,
        diff: JSON.stringify({ teamsCount: 3, solver: "OR-Tools CP-SAT" }),
      },
      {
        programId: program.id,
        actorId: pm.id,
        action: "APPROVAL_REQUESTED_PUBLISH_RESULTS",
        targetType: "Result",
        targetId: program.id,
        diff: JSON.stringify({ requestedBy: "Elena Rostova" }),
      },
    ],
  });

  console.log("Successfully seeded CommunityOps database with rich realistic data!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
