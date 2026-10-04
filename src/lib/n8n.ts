import crypto from "crypto";

export interface OutboundEventPayload {
  eventId: string;
  eventType: string;
  aggregateType: string;
  aggregateId: string;
  timestamp: string;
  data: Record<string, any>;
}

export interface InboundWebhookAction {
  action: "ingest_application" | "submit_project" | "approval_decision" | "mentor_checkin";
  programId: string;
  payload: Record<string, any>;
  source?: string;
}

/**
 * Signs a payload with HMAC-SHA256
 */
export function generateWebhookSignature(
  rawBody: string,
  timestamp: string,
  secret: string
): string {
  const hmac = crypto.createHmac("sha256", secret);
  hmac.update(`${timestamp}.${rawBody}`);
  return hmac.digest("hex");
}

/**
 * Validates HMAC-SHA256 signature from n8n incoming webhook with replay protection
 */
export function verifyN8nWebhookSignature(
  rawBody: string,
  signature: string | null,
  timestamp: string | null,
  secret: string = process.env.COMMUNITY_OPS_WEBHOOK_SECRET || "community-ops-n8n-webhook-secret-2026",
  maxAgeSeconds: number = 300 // 5 minutes
): { valid: boolean; reason?: string } {
  if (!signature || !timestamp) {
    return { valid: false, reason: "Missing signature or timestamp header" };
  }

  // Prevent replay attacks
  const tsNum = parseInt(timestamp, 10);
  const now = Math.floor(Date.now() / 1000);
  if (isNaN(tsNum) || Math.abs(now - tsNum) > maxAgeSeconds) {
    return { valid: false, reason: "Webhook timestamp expired or out of bounds" };
  }

  const expectedSignature = generateWebhookSignature(rawBody, timestamp, secret);

  const sigBuffer = Buffer.from(signature, "hex");
  const expectedBuffer = Buffer.from(expectedSignature, "hex");

  if (sigBuffer.length !== expectedBuffer.length) {
    return { valid: false, reason: "Invalid signature length" };
  }

  const matches = crypto.timingSafeEqual(sigBuffer, expectedBuffer);
  return { valid: matches, reason: matches ? undefined : "Signature mismatch" };
}

/**
 * Dispatches an event from CommunityOps to n8n webhook
 */
export async function dispatchToN8n(
  eventType: string,
  aggregateType: string,
  aggregateId: string,
  data: Record<string, any>,
  customWebhookUrl?: string
): Promise<{ success: boolean; statusCode?: number; error?: string; responseData?: any }> {
  const webhookUrl = customWebhookUrl || process.env.N8N_WEBHOOK_URL;
  if (!webhookUrl) {
    return { success: false, error: "N8N_WEBHOOK_URL not configured" };
  }

  const secret = process.env.COMMUNITY_OPS_WEBHOOK_SECRET || "community-ops-n8n-webhook-secret-2026";
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const eventId = `evt_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

  const eventPayload: OutboundEventPayload = {
    eventId,
    eventType,
    aggregateType,
    aggregateId,
    timestamp: new Date().toISOString(),
    data,
  };

  const rawBody = JSON.stringify(eventPayload);
  const signature = generateWebhookSignature(rawBody, timestamp, secret);

  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-CommunityOps-Signature": signature,
        "X-CommunityOps-Timestamp": timestamp,
        "X-CommunityOps-Event": eventType,
        "User-Agent": "CommunityOps-EventDispatcher/1.0",
      },
      body: rawBody,
      signal: AbortSignal.timeout(10000), // 10s timeout
    });

    let resData: any = null;
    const contentType = response.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      try {
        resData = await response.json();
      } catch (e) {
        // ignore parse error
      }
    } else {
      resData = await response.text();
    }

    if (!response.ok) {
      return {
        success: false,
        statusCode: response.status,
        error: `n8n responded with status ${response.status}: ${JSON.stringify(resData)}`,
        responseData: resData,
      };
    }

    return {
      success: true,
      statusCode: response.status,
      responseData: resData,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || "Failed to reach n8n webhook",
    };
  }
}
