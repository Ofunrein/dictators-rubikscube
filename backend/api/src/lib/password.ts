/**
 * password.ts — Argon2id password hashing and verification
 *
 * Wraps the argon2 library so the rest of the codebase never calls it directly.
 * Argon2id is the recommended algorithm for password storage because it resists
 * both GPU-based and side-channel attacks.
 *
 * Key exports:
 *   - hashPassword(password) — returns a hash string to store in the database
 *   - verifyPassword(hash, password) — returns true if password matches the hash
 */
import argon2 from 'argon2';

export async function hashPassword(password: string): Promise<string> {
  return argon2.hash(password, { type: argon2.argon2id });
}

export async function verifyPassword(passwordHash: string, password: string): Promise<boolean> {
  try {
    return await argon2.verify(passwordHash, password);
  } catch {
    return false;
  }
}
