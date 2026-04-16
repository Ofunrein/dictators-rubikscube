const authState = {
  accessToken: null,
  expiresAtMs: 0,
  user: null,
  bootstrapped: false,
};

const listeners = new Set();

function notify() {
  for (const listener of listeners) {
    try {
      listener(getAuthSessionState());
    } catch {
      // Ignore subscriber errors so auth state updates remain resilient.
    }
  }
}

export function applyAuthPayload(payload) {
  const expiresIn = Number(payload?.expiresIn ?? 0);
  authState.accessToken = typeof payload?.accessToken === 'string' ? payload.accessToken : null;
  authState.expiresAtMs = expiresIn > 0 ? Date.now() + expiresIn * 1000 : 0;
  authState.user = payload?.user ?? null;
  authState.bootstrapped = true;
  notify();
}

export function clearAuthState() {
  authState.accessToken = null;
  authState.expiresAtMs = 0;
  authState.user = null;
  authState.bootstrapped = true;
  notify();
}

export function markAuthBootstrapped() {
  authState.bootstrapped = true;
  notify();
}

export function updateAuthUser(user) {
  authState.user = user ?? null;
  authState.bootstrapped = true;
  notify();
}

export function getAccessToken() {
  if (!authState.accessToken) {
    return null;
  }

  if (authState.expiresAtMs > 0 && Date.now() >= authState.expiresAtMs) {
    return null;
  }

  return authState.accessToken;
}

export function getAuthSessionState() {
  return {
    accessToken: getAccessToken(),
    expiresAtMs: authState.expiresAtMs,
    user: authState.user,
    bootstrapped: authState.bootstrapped,
    isAuthenticated: Boolean(getAccessToken()),
  };
}

export function subscribeAuthState(listener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
