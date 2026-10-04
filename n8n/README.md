# CommunityOps n8n Workflow Automation Hub

This directory contains production-ready n8n workflow templates for automating CommunityOps pipelines:
- Multi-channel communications (Email + Discord + Slack)
- Form intake (Typeform, Google Forms, Tally)
- Interactive Dual-Approval alerts
- Scheduled mentor check-ins

---

## 1. Quick Start with Docker Compose

n8n is integrated into `docker-compose.yml`:

```bash
# Start all services (PostgreSQL, Redis, CP-SAT Optimizer, n8n)
docker-compose up -d
```

n8n will be accessible in your browser at:
`http://localhost:5678`

---

## 2. Importing Workflows into n8n

1. Open `http://localhost:5678` in your browser.
2. Complete the initial local account setup (takes 30 seconds).
3. In the left sidebar, click **Workflows** &rarr; **Add Workflow** &rarr; **Import from File...**
4. Select any of the JSON files from `n8n/workflows/`:
   - `01-communication-dispatcher.json`: Multi-channel communication router for Outbox events.
   - `02-inbound-application-intake.json`: Ingests applicants from external form webhooks and registers them in CommunityOps.
   - `03-dual-approval-slack-discord.json`: Pushes approval requests to Discord/Slack.
   - `04-mentor-reminder-checkin.json`: Daily scheduled check-ins for active mentors.
5. Click **Save** and toggle the workflow to **Active**.

---

## 3. Environment Configuration

Add the following to your `.env` file:

```env
# n8n Base URL and Outbound Webhook Trigger
N8N_BASE_URL="http://localhost:5678"
N8N_WEBHOOK_URL="http://localhost:5678/webhook/community-ops-events"

# Shared HMAC Secret for signing & verifying webhooks
COMMUNITY_OPS_WEBHOOK_SECRET="community-ops-n8n-webhook-secret-2026"
```

---

## 4. Inbound Webhook API Reference

CommunityOps exposes an inbound webhook endpoint for n8n:
`POST /api/webhooks/n8n`

### Supported Actions

#### `ingest_application`
```json
{
  "action": "ingest_application",
  "data": {
    "name": "Devon Reed",
    "email": "devon@example.com",
    "skills": ["Python", "PyTorch", "Next.js"],
    "rolePref": "Full Stack",
    "timezone": -5,
    "autoAccept": false
  }
}
```

#### `approval_decision`
```json
{
  "action": "approval_decision",
  "data": {
    "approvalId": "clx...",
    "approverEmail": "admin@communityops.org",
    "decision": "APPROVE"
  }
}
```

#### `submit_project`
```json
{
  "action": "submit_project",
  "data": {
    "teamId": "clx...",
    "title": "Autonomous Agent Swarm",
    "repoUrl": "https://github.com/org/repo",
    "demoUrl": "https://demo.example.com",
    "description": "Built during Global AI Hackathon"
  }
}
```
