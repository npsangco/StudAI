import crypto from 'crypto';

// Field-level encryption helper using AES-256-GCM
// Requires environment variable FIELD_ENCRYPTION_KEY.
// FIELD_ENCRYPTION_KEY can be a 32-byte base64 string or a passphrase.

const KEY_ENV = process.env.FIELD_ENCRYPTION_KEY || process.env.ENCRYPTION_KEY;

let CACHED_KEY = null;
const ALGO = 'aes-256-gcm';
const IV_LENGTH = 12; // recommended for GCM

function deriveKey() {
  if (CACHED_KEY) return CACHED_KEY;
  if (!KEY_ENV) {
    // Do not throw here; higher-level code will decide whether encryption is required.
    return null;
  }

  // If key looks like base64 of 32 bytes, use it directly
  try {
    const buf = Buffer.from(KEY_ENV, 'base64');
    if (buf.length === 32) {
      CACHED_KEY = buf;
      return CACHED_KEY;
    }
  } catch (e) {}

  // Otherwise derive a 32-byte key from the passphrase with scrypt
  CACHED_KEY = crypto.scryptSync(KEY_ENV, 'field-encryption-salt', 32);
  return CACHED_KEY;
}

function isLikelyEncrypted(str) {
  if (str === null || str === undefined) return false;
  if (typeof str !== 'string') return false;
  try {
    const data = Buffer.from(str, 'base64');
    return data.length > IV_LENGTH + 16; // iv + tag + at least 1 byte ciphertext
  } catch (e) {
    return false;
  }
}

export function encryptField(plainText) {
  if (plainText === null || plainText === undefined) return plainText;
  const key = deriveKey();
  if (!key) throw new Error('FIELD_ENCRYPTION_KEY not set in environment');

  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGO, key, iv);
  const encrypted = Buffer.concat([cipher.update(String(plainText), 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();

  // store as base64: iv(12) + tag(16) + ciphertext
  return Buffer.concat([iv, tag, encrypted]).toString('base64');
}

export function decryptField(encoded) {
  if (encoded === null || encoded === undefined) return encoded;

  // If the stored value does not look encrypted, return it as-is (legacy plaintext)
  if (!isLikelyEncrypted(encoded)) return encoded;

  const key = deriveKey();
  if (!key) {
    console.warn('Attempted to decrypt field but FIELD_ENCRYPTION_KEY not set; returning ciphertext');
    return encoded;
  }

  try {
    const data = Buffer.from(encoded, 'base64');
    const iv = data.slice(0, IV_LENGTH);
    const tag = data.slice(IV_LENGTH, IV_LENGTH + 16);
    const ciphertext = data.slice(IV_LENGTH + 16);
    const decipher = crypto.createDecipheriv(ALGO, key, iv);
    decipher.setAuthTag(tag);
    const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
    return decrypted.toString('utf8');
  } catch (err) {
    console.error('Field decryption failed:', err.message);
    // If decryption fails, return original ciphertext so caller can decide
    return encoded;
  }
}

export function encryptMaybeJSON(obj) {
  if (obj === null || obj === undefined) return obj;
  const s = typeof obj === 'string' ? obj : JSON.stringify(obj);
  return encryptField(s);
}

export function decryptMaybeJSON(str) {
  if (str === null || str === undefined) return str;
  const dec = decryptField(str);
  if (dec === null) return null;
  // If decryptField returned the original ciphertext because key missing, try to parse
  try {
    return JSON.parse(dec);
  } catch (e) {
    return dec;
  }
}

export default {
  encryptField,
  decryptField,
  encryptMaybeJSON,
  decryptMaybeJSON,
};
