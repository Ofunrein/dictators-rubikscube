/**
 * isPlainObject.js — Checks if a value is a plain {} object
 *
 * Returns true for objects like { a: 1 }, false for arrays, null, dates, etc.
 * Used in validation code across the project. Defined once here instead of
 * copy-pasting into every file that needs it.
 */
export function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}
