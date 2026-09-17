/**
 * Password hashing for the admin login.
 *
 * Uses Node's built-in scrypt (no extra dependency) with a random per-hash
 * salt, and stores every parameter inside the hash string so the cost can be
 * raised later without breaking existing hashes:
 *
 *   scrypt$<N>$<r>$<p>$<salt base64>$<derived key base64>
 *
 * Only this string is ever configured on the server (ADMIN_PASSWORD_HASH).
 * The plaintext password exists only in the admin's head and, transiently,
 * in the login request.
 */
import crypto from 'crypto';

const SCHEME = 'scrypt';
// N=2^15, r=8, p=1: ~33 MB and tens of milliseconds per verification. Strong
// enough to make offline guessing of a leaked hash expensive, cheap enough for
// a rate-limited login endpoint on a small instance.
const DEFAULT_PARAMS = { N: 32768, r: 8, p: 1 };
const KEY_LENGTH = 64;
const SALT_BYTES = 16;
// scrypt needs 128 * N * r bytes; allow headroom above Node's 32 MB default.
const MAX_MEM = 128 * 1024 * 1024;

/** Upper bound on accepted cost parameters, so a malformed or hostile hash
 * string cannot make a single login attempt consume unbounded memory/CPU. */
const MAX_N = 1 << 17;

function scryptAsync(password: string, salt: Buffer, N: number, r: number, p: number): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    crypto.scrypt(password, salt, KEY_LENGTH, { N, r, p, maxmem: MAX_MEM }, (err, key) => {
      if (err) reject(err);
      else resolve(key);
    });
  });
}

export async function hashPassword(password: string): Promise<string> {
  if (typeof password !== 'string' || password.length === 0) {
    throw new Error('password must be a non-empty string');
  }
  const salt = crypto.randomBytes(SALT_BYTES);
  const { N, r, p } = DEFAULT_PARAMS;
  const key = await scryptAsync(password, salt, N, r, p);
  return [SCHEME, N, r, p, salt.toString('base64'), key.toString('base64')].join('$');
}

interface ParsedHash {
  N: number;
  r: number;
  p: number;
  salt: Buffer;
  key: Buffer;
}

export function parsePasswordHash(stored: string): ParsedHash | null {
  if (typeof stored !== 'string') return null;
  const parts = stored.trim().split('$');
  if (parts.length !== 6 || parts[0] !== SCHEME) return null;
  const [, nStr, rStr, pStr, saltB64, keyB64] = parts;
  const N = Number(nStr);
  const r = Number(rStr);
  const p = Number(pStr);
  const isPowerOfTwo = Number.isInteger(N) && N > 1 && (N & (N - 1)) === 0;
  if (!isPowerOfTwo || N > MAX_N) return null;
  if (!Number.isInteger(r) || r < 1 || r > 32) return null;
  if (!Number.isInteger(p) || p < 1 || p > 16) return null;
  const salt = Buffer.from(saltB64, 'base64');
  const key = Buffer.from(keyB64, 'base64');
  if (salt.length < 16 || key.length !== KEY_LENGTH) return null;
  return { N, r, p, salt, key };
}

export function isValidPasswordHash(stored: string | undefined): boolean {
  return !!stored && parsePasswordHash(stored) !== null;
}

/** Constant-time verification. Returns false (never throws) for a wrong
 * password, a malformed hash, or any internal error. */
export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const parsed = parsePasswordHash(stored);
  if (!parsed || typeof password !== 'string') return false;
  try {
    const candidate = await scryptAsync(password, parsed.salt, parsed.N, parsed.r, parsed.p);
    return candidate.length === parsed.key.length && crypto.timingSafeEqual(candidate, parsed.key);
  } catch {
    return false;
  }
}

/** Constant-time string equality that does not leak length through an early
 * return (both sides are hashed to a fixed size first). */
export function timingSafeStringEqual(a: string, b: string): boolean {
  const ha = crypto.createHash('sha256').update(String(a), 'utf8').digest();
  const hb = crypto.createHash('sha256').update(String(b), 'utf8').digest();
  return crypto.timingSafeEqual(ha, hb);
}

/** A well-formed hash of a random value, used to spend the same scrypt time
 * when the username is wrong, so response timing does not reveal whether the
 * username exists. Computed lazily once per process. */
let dummyHash: Promise<string> | null = null;
export function getDummyPasswordHash(): Promise<string> {
  if (!dummyHash) dummyHash = hashPassword(crypto.randomBytes(32).toString('hex'));
  return dummyHash;
}
