/**
 * Minimal backend connectivity probe.
 * Returns a stub response until the API is wired.
 * @returns {Promise<{ok: boolean, message: string}>}
 */
export async function pingBackend() {
  // Sprint 1 placeholder: API wiring starts in Sprint 2.
  return { ok: false, message: 'Backend not wired yet' };
}
