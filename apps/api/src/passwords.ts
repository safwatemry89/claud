import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';

// One of OWASP's recommended scrypt settings: N=2^15, r=8, p=3 (32 MiB per hash).
const N = 32768;
const R = 8;
const P = 3;
const KEY_LEN = 64;
const MAX_MEM = 64 * 1024 * 1024;

export const MIN_PASSWORD_LENGTH = 10;
export const MAX_PASSWORD_LENGTH = 200;

function derive(password: string, salt: Buffer, n: number, r: number, p: number): Promise<Buffer> {
  return new Promise((resolve, reject) =>
    scrypt(password.normalize('NFKC'), salt, KEY_LEN, { N: n, r, p, maxmem: MAX_MEM }, (err, key) => (err ? reject(err) : resolve(key))),
  );
}

/** Returns `scrypt$N$r$p$salt$hash` (base64 parts) so cost can be raised later without breaking stored hashes. */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await derive(password, salt, N, R, P);
  return ['scrypt', N, R, P, salt.toString('base64'), key.toString('base64')].join('$');
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [alg, n, r, p, salt, hash] = stored.split('$');
  if (alg !== 'scrypt' || !salt || !hash) return false;
  const expected = Buffer.from(hash, 'base64');
  const key = await derive(password, Buffer.from(salt, 'base64'), Number(n), Number(r), Number(p));
  return key.length === expected.length && timingSafeEqual(key, expected);
}

/** Hash checked against when the email is unknown, so response time does not reveal which emails have accounts. */
let dummyHash: Promise<string> | undefined;
export function dummyPasswordHash(): Promise<string> {
  return (dummyHash ??= hashPassword(randomBytes(16).toString('hex')));
}
