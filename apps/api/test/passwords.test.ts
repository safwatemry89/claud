import { describe, expect, it } from 'vitest';
import { dummyPasswordHash, hashPassword, verifyPassword } from '../src/passwords';

describe('passwords', () => {
  it('verifies the right password and rejects a wrong one', async () => {
    const stored = await hashPassword('correct horse battery');
    expect(stored).toMatch(/^scrypt\$32768\$8\$3\$/);
    expect(await verifyPassword('correct horse battery', stored)).toBe(true);
    expect(await verifyPassword('correct horse batterx', stored)).toBe(false);
  });

  it('salts each hash', async () => {
    expect(await hashPassword('same password')).not.toBe(await hashPassword('same password'));
  });

  it('rejects malformed stored hashes', async () => {
    expect(await verifyPassword('x', '')).toBe(false);
    expect(await verifyPassword('x', 'bcrypt$abc')).toBe(false);
  });

  it('treats Unicode-equivalent passwords as equal', async () => {
    const stored = await hashPassword('café-password');
    expect(await verifyPassword('café-password', stored)).toBe(true);
  });

  it('dummy hash matches nothing a user would type', async () => {
    expect(await verifyPassword('', await dummyPasswordHash())).toBe(false);
  });
});
