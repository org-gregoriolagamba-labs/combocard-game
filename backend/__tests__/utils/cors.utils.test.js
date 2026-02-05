/**
 * CORS Utils Tests
 *
 * Unit tests for the CORS origin handler, including wildcard pattern
 * matching for LAN IP addresses.
 */

import { jest } from "@jest/globals";
import { wildcardToRegex, buildCorsOriginHandler } from "../../src/utils/cors.utils.js";

// ─────────────────────────────────────────────────────
// wildcardToRegex
// ─────────────────────────────────────────────────────
describe("wildcardToRegex", () => {
  test("should convert a wildcard pattern to a RegExp", () => {
    const re = wildcardToRegex("http://192.168.1.*:3000");
    expect(re).toBeInstanceOf(RegExp);
  });

  test("should match LAN IPs against http://192.168.1.*:3000", () => {
    const re = wildcardToRegex("http://192.168.1.*:3000");
    expect(re.test("http://192.168.1.42:3000")).toBe(true);
    expect(re.test("http://192.168.1.100:3000")).toBe(true);
    expect(re.test("http://192.168.1.1:3000")).toBe(true);
    expect(re.test("http://192.168.1.255:3000")).toBe(true);
  });

  test("should NOT match different subnets or ports", () => {
    const re = wildcardToRegex("http://192.168.1.*:3000");
    expect(re.test("http://192.168.2.1:3000")).toBe(false);
    expect(re.test("http://192.168.1.1:4000")).toBe(false);
    expect(re.test("http://10.0.0.1:3000")).toBe(false);
    expect(re.test("http://evil.com")).toBe(false);
  });

  test("should properly escape dots so they don't match arbitrary chars", () => {
    const re = wildcardToRegex("http://192.168.1.*:3000");
    // A dot in the pattern must match a literal dot, not any character
    expect(re.test("http://192X168Y1Z42:3000")).toBe(false);
  });

  test("should support wildcards at various positions", () => {
    const re = wildcardToRegex("http://*.example.com");
    expect(re.test("http://app.example.com")).toBe(true);
    expect(re.test("http://api.example.com")).toBe(true);
    expect(re.test("http://example.com")).toBe(false);
  });

  test("should support multiple wildcards", () => {
    const re = wildcardToRegex("http://*.*.*.*:3000");
    expect(re.test("http://192.168.1.42:3000")).toBe(true);
    expect(re.test("http://10.0.0.1:3000")).toBe(true);
  });
});

// ─────────────────────────────────────────────────────
// buildCorsOriginHandler
// ─────────────────────────────────────────────────────
describe("buildCorsOriginHandler", () => {

  // Helper to call the handler and return { allowed, error }
  const checkOrigin = (handler, origin) =>
    new Promise((resolve) => {
      handler(origin, (err, result) => {
        resolve({ allowed: !!result, error: err });
      });
    });

  describe("allow-all mode (wildcard *)", () => {
    test("should allow any origin when config is '*'", async () => {
      const handler = buildCorsOriginHandler("*");
      const result = await checkOrigin(handler, "http://evil.com");
      expect(result.allowed).toBe(true);
      expect(result.error).toBeNull();
    });

    test("should allow undefined origin when config is '*'", async () => {
      const handler = buildCorsOriginHandler("*");
      const result = await checkOrigin(handler, undefined);
      expect(result.allowed).toBe(true);
    });
  });

  describe("exact origin matching", () => {
    const handler = buildCorsOriginHandler("http://localhost:3000,http://localhost:3001");

    test("should allow listed origins", async () => {
      const r1 = await checkOrigin(handler, "http://localhost:3000");
      expect(r1.allowed).toBe(true);

      const r2 = await checkOrigin(handler, "http://localhost:3001");
      expect(r2.allowed).toBe(true);
    });

    test("should block unlisted origins", async () => {
      const result = await checkOrigin(handler, "http://evil.com");
      expect(result.allowed).toBe(false);
      expect(result.error).toBeTruthy();
    });

    test("should allow requests with no origin (server-to-server)", async () => {
      const result = await checkOrigin(handler, undefined);
      expect(result.allowed).toBe(true);
    });
  });

  describe("wildcard (LAN) origin matching", () => {
    const handler = buildCorsOriginHandler(
      "http://localhost:3000,http://localhost:3001,http://192.168.1.*:3000"
    );

    test("should still allow exact localhost origins", async () => {
      const result = await checkOrigin(handler, "http://localhost:3000");
      expect(result.allowed).toBe(true);
    });

    test("should allow LAN IP 192.168.1.42:3000", async () => {
      const result = await checkOrigin(handler, "http://192.168.1.42:3000");
      expect(result.allowed).toBe(true);
    });

    test("should allow LAN IP 192.168.1.100:3000", async () => {
      const result = await checkOrigin(handler, "http://192.168.1.100:3000");
      expect(result.allowed).toBe(true);
    });

    test("should allow LAN IP 192.168.1.1:3000", async () => {
      const result = await checkOrigin(handler, "http://192.168.1.1:3000");
      expect(result.allowed).toBe(true);
    });

    test("should block different subnet 192.168.2.1:3000", async () => {
      const result = await checkOrigin(handler, "http://192.168.2.1:3000");
      expect(result.allowed).toBe(false);
    });

    test("should block different port 192.168.1.42:4000", async () => {
      const result = await checkOrigin(handler, "http://192.168.1.42:4000");
      expect(result.allowed).toBe(false);
    });

    test("should block external origins", async () => {
      const result = await checkOrigin(handler, "http://evil.com");
      expect(result.allowed).toBe(false);
    });

    test("should allow requests with no origin", async () => {
      const result = await checkOrigin(handler, undefined);
      expect(result.allowed).toBe(true);
    });
  });
});
