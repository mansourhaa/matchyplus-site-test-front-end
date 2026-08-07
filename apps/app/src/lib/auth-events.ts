// Lets `lib/api.ts` notify the Redux store of an unrecoverable auth failure (refresh
// token rejected) without importing `lib/store.ts` directly. `auth-slice.ts` imports
// `api` from `lib/api.ts`, so `api.ts` importing the store back would create a
// circular import (api.ts -> store.ts -> root-reducer.ts -> auth-slice.ts -> api.ts).
// This module has no dependency on either side, so it breaks the cycle: `store.ts`
// registers the real handler once the store exists; `api.ts` only ever calls it.
let handler: (() => void) | null = null;

export function setAuthFailureHandler(fn: (() => void) | null) {
  handler = fn;
}

export function notifyAuthFailure() {
  handler?.();
}
