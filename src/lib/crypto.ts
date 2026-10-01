import crypto from "crypto";
import fs from "fs";
import path from "path";

export interface CanonicalCertificatePayload {
  cert_id: string;
  recipient_name: string;
  recipient_email_hash: string;
  program: string;
  role: string;
  issued_at: string;
  template_version: string;
  revoked: boolean;
}

let cachedKeyPair: { publicKey: string; privateKey: string } | null = null;

const KEY_DIR = path.resolve(process.cwd(), ".keys");
const KEY_FILE = path.join(KEY_DIR, "ed25519-ca.json");

export function getOrCreateEd25519KeyPair(): { publicKey: string; privateKey: string } {
  if (cachedKeyPair) return cachedKeyPair;

  // Check if persisted key exists
  try {
    if (fs.existsSync(KEY_FILE)) {
      const data = JSON.parse(fs.readFileSync(KEY_FILE, "utf8"));
      if (data.publicKey && data.privateKey) {
        cachedKeyPair = data;
        return cachedKeyPair!;
      }
    }
  } catch (e) {
    // Fall back to generating new
  }

  // Generate an Ed25519 keypair
  const { publicKey, privateKey } = crypto.generateKeyPairSync("ed25519", {
    publicKeyEncoding: { type: "spki", format: "pem" },
    privateKeyEncoding: { type: "pkcs8", format: "pem" },
  });

  cachedKeyPair = { publicKey, privateKey };

  try {
    if (!fs.existsSync(KEY_DIR)) {
      fs.mkdirSync(KEY_DIR, { recursive: true });
    }
    fs.writeFileSync(KEY_FILE, JSON.stringify(cachedKeyPair, null, 2), "utf8");
  } catch (err) {
    console.warn("Could not persist key to disk, using in-memory key", err);
  }

  return cachedKeyPair;
}

/**
 * Returns a canonical, sorted-key JSON string to guarantee identical hash representation
 */
export function canonicalizeJson(obj: any): string {
  if (obj === null || typeof obj !== "object") {
    return JSON.stringify(obj);
  }
  if (Array.isArray(obj)) {
    return "[" + obj.map(canonicalizeJson).join(",") + "]";
  }
  const keys = Object.keys(obj).sort();
  return (
    "{" +
    keys
      .map((key) => JSON.stringify(key) + ":" + canonicalizeJson(obj[key]))
      .join(",") +
    "}"
  );
}

/**
 * Hash an email using SHA-256 for privacy in public certificate registries
 */
export function hashEmail(email: string): string {
  return crypto.createHash("sha256").update(email.trim().toLowerCase()).digest("hex");
}

/**
 * Generate a unique base58-style certificate identifier
 */
export function generateCertificateId(prefix = "CERT"): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const randomBytes = crypto.randomBytes(6).toString("hex").toUpperCase();
  return `${prefix}_${timestamp}_${randomBytes.slice(0, 6)}`;
}

/**
 * Sign canonical JSON using Ed25519 private key
 */
export function signCertificatePayload(payload: CanonicalCertificatePayload): {
  canonicalJson: string;
  signatureHex: string;
  publicKeyPem: string;
} {
  const { publicKey, privateKey } = getOrCreateEd25519KeyPair();
  const canonicalJson = canonicalizeJson(payload);
  const data = Buffer.from(canonicalJson, "utf8");

  const signature = crypto.sign(null, data, privateKey);
  const signatureHex = signature.toString("hex");

  return {
    canonicalJson,
    signatureHex,
    publicKeyPem: publicKey,
  };
}

/**
 * Cryptographically verify an Ed25519 signature against canonical payload
 */
export function verifyCertificateSignature(
  canonicalPayload: string,
  signatureHex: string,
  publicKeyPem?: string
): boolean {
  try {
    const key = publicKeyPem || getOrCreateEd25519KeyPair().publicKey;
    const data = Buffer.from(canonicalPayload, "utf8");
    const signature = Buffer.from(signatureHex, "hex");

    return crypto.verify(null, data, key, signature);
  } catch (err) {
    console.error("Verification error:", err);
    return false;
  }
}
