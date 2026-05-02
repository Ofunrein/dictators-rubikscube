import { describe, expect, it } from 'vitest';

// supabase.js exports either a real Supabase client or a stub when env vars
// are missing. In the test environment VITE_SUPABASE_URL is not set, so the
// stub is always exported here. These tests verify the stub behaves safely
// instead of throwing or making requests to an invalid URL.
import { supabase } from './supabase.js';

describe('supabase stub (missing env vars)', () => {
  it('exports a supabase object', () => {
    expect(supabase).toBeDefined();
    expect(typeof supabase).toBe('object');
  });

  it('stub rpc() resolves with ENV_MISSING error', async () => {
    const result = await supabase.rpc('any_function', {});
    expect(result.data).toBeNull();
    expect(result.error).toBeInstanceOf(Error);
    expect(result.error.code).toBe('ENV_MISSING');
  });

  it('stub getSession() resolves with null session and no error', async () => {
    const result = await supabase.auth.getSession();
    expect(result.data.session).toBeNull();
    expect(result.error).toBeNull();
  });

  it('stub getUser() resolves with ENV_MISSING error', async () => {
    const result = await supabase.auth.getUser();
    expect(result.data).toBeNull();
    expect(result.error).toBeInstanceOf(Error);
    expect(result.error.code).toBe('ENV_MISSING');
  });

  it('stub signOut() resolves with no error', async () => {
    const result = await supabase.auth.signOut();
    expect(result.error).toBeNull();
  });

  it('stub onAuthStateChange() returns an unsubscribe function', () => {
    const subscription = supabase.auth.onAuthStateChange(() => {});
    expect(typeof subscription.data.subscription.unsubscribe).toBe('function');
    expect(() => subscription.data.subscription.unsubscribe()).not.toThrow();
  });

  it('stub from().select().gt().order().limit() resolves with ENV_MISSING error', async () => {
    const result = await supabase
      .from('any_table')
      .select('*')
      .gt('col', 0)
      .order('col')
      .limit(10);
    expect(result.data).toBeNull();
    expect(result.error).toBeInstanceOf(Error);
    expect(result.error.code).toBe('ENV_MISSING');
  });
});
