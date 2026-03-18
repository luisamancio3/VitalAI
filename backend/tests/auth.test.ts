import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock jose before importing
vi.mock("jose", () => ({
  createRemoteJWKSet: vi.fn().mockReturnValue("mock-jwks"),
  jwtVerify: vi.fn(),
}));

import { jwtVerify } from "jose";

// We test the auth middleware logic directly by simulating Fastify request/reply
describe("Auth Middleware", () => {
  let authMiddleware: (request: any, reply: any) => Promise<void>;

  beforeEach(async () => {
    vi.clearAllMocks();
    // Re-import to get fresh module with mocks
    const mod = await import("../src/middleware/auth.js");
    authMiddleware = mod.authMiddleware;
  });

  function createMockRequest(authHeader?: string) {
    return {
      headers: {
        authorization: authHeader,
      },
      userId: undefined as string | undefined,
    };
  }

  function createMockReply() {
    const reply: any = {
      statusCode: 200,
      body: null,
    };
    reply.status = vi.fn((code: number) => {
      reply.statusCode = code;
      return reply;
    });
    reply.send = vi.fn((body: any) => {
      reply.body = body;
      return reply;
    });
    return reply;
  }

  it("should attach userId to request for valid token", async () => {
    (jwtVerify as ReturnType<typeof vi.fn>).mockResolvedValue({
      payload: { sub: "auth0|user123", email: "test@test.com" },
      protectedHeader: { alg: "RS256" },
    });

    const request = createMockRequest("Bearer valid-token-here");
    const reply = createMockReply();

    await authMiddleware(request, reply);

    expect(request.userId).toBe("auth0|user123");
    expect(reply.status).not.toHaveBeenCalled();
  });

  it("should return 401 for expired/invalid token", async () => {
    (jwtVerify as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("Token expired"));

    const request = createMockRequest("Bearer expired-token");
    const reply = createMockReply();

    await authMiddleware(request, reply);

    expect(reply.status).toHaveBeenCalledWith(401);
    expect(reply.body).toEqual({ error: "Invalid or expired token" });
  });

  it("should return 401 for missing Authorization header", async () => {
    const request = createMockRequest(undefined);
    const reply = createMockReply();

    await authMiddleware(request, reply);

    expect(reply.status).toHaveBeenCalledWith(401);
    expect(reply.body).toEqual({ error: "Missing or invalid Authorization header" });
  });

  it("should return 401 for non-Bearer authorization", async () => {
    const request = createMockRequest("Basic dXNlcjpwYXNz");
    const reply = createMockReply();

    await authMiddleware(request, reply);

    expect(reply.status).toHaveBeenCalledWith(401);
    expect(reply.body).toEqual({ error: "Missing or invalid Authorization header" });
  });

  it("should return 401 when token has no sub claim", async () => {
    (jwtVerify as ReturnType<typeof vi.fn>).mockResolvedValue({
      payload: { email: "test@test.com" }, // no sub
      protectedHeader: { alg: "RS256" },
    });

    const request = createMockRequest("Bearer token-no-sub");
    const reply = createMockReply();

    await authMiddleware(request, reply);

    expect(reply.status).toHaveBeenCalledWith(401);
    expect(reply.body).toEqual({ error: "Token missing sub claim" });
  });
});
