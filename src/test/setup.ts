import "@testing-library/jest-dom/vitest";
import "fake-indexeddb/auto";

// Minimal stubs used by some screens.
Object.defineProperty(globalThis, "Notification", {
  value: {
    permission: "denied",
    requestPermission: async () => "denied",
  },
  writable: true,
});

Object.defineProperty(globalThis, "crypto", {
  value: (globalThis.crypto ?? {
    randomUUID: () => `test-${Math.random().toString(16).slice(2)}`,
  }) as Crypto,
});
