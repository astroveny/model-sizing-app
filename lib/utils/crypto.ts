import crypto from "crypto";
import fs from "fs";
import path from "path";

const ALGORITHM = "aes-256-gcm";
const KEY_LENGTH = 32; // bytes
const IV_LENGTH = 12;  // GCM standard
const TAG_LENGTH = 16;

function getSecretKey(): Buffer {
  let secret = process.env.MODEL_STORE_SECRET;

  if (!secret) {
    // Auto-generate and persist to .env
    secret = crypto.randomBytes(KEY_LENGTH).toString("hex");
    const envPath = path.join(process.cwd(), ".env");
    const line = `\nMODEL_STORE_SECRET=${secret}\n`;
    try {
      fs.appendFileSync(envPath, line, "utf8");
    } catch {
      // .env may not be writable in Docker; continue with in-memory secret
    }
    process.env.MODEL_STORE_SECRET = secret;
    console.warn(
      "[ml-sizer] MODEL_STORE_SECRET was not set. A new secret has been generated and appended to .env. " +
      "Back it up — losing it means stored API keys cannot be decrypted."
    );
  }

  const buf = Buffer.from(secret, "hex");
  if (buf.length !== KEY_LENGTH) {
    throw new Error(
      `MODEL_STORE_SECRET must be a 64-character hex string (32 bytes). Got ${secret.length} chars.`
    );
  }
  return buf;
}

/**
 * Encrypts plaintext using AES-256-GCM.
 * Returns base64-encoded `iv:tag:ciphertext`.
 */
export function encrypt(plaintext: string): string {
  const key = getSecretKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv, { authTagLength: TAG_LENGTH });
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv.toString("base64"), tag.toString("base64"), encrypted.toString("base64")].join(":");
}

/**
 * Decrypts a value produced by `encrypt`.
 * Throws if the key is wrong or the ciphertext is tampered.
 */
export function decrypt(ciphertext: string): string {
  const key = getSecretKey();
  const parts = ciphertext.split(":");
  if (parts.length !== 3) throw new Error("Invalid ciphertext format");
  const [ivB64, tagB64, dataB64] = parts;
  const iv = Buffer.from(ivB64, "base64");
  const tag = Buffer.from(tagB64, "base64");
  const data = Buffer.from(dataB64, "base64");
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv, { authTagLength: TAG_LENGTH });
  decipher.setAuthTag(tag);
  return decipher.update(data).toString("utf8") + decipher.final("utf8");
}

/** Masks an API key for display: "sk-abc...****" */
export function maskApiKey(key: string): string {
  if (key.length <= 8) return "****";
  return key.slice(0, 6) + "..." + "****";
}
