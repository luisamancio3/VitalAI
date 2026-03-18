import { createRemoteJWKSet, jwtVerify } from "jose";
import type { FastifyRequest, FastifyReply } from "fastify";

const AUTH_ISSUER_URL = process.env.AUTH0_ISSUER_URL || "https://dev-22aba04dg1rve7hb.us.auth0.com/";
const AUTH_AUDIENCE = process.env.AUTH0_AUDIENCE || "https://api.vitalai.com";

// jose caches the JWKS internally
const jwks = createRemoteJWKSet(
  new URL(".well-known/jwks.json", AUTH_ISSUER_URL),
);

declare module "fastify" {
  interface FastifyRequest {
    userId: string;  // Auth0 sub claim
  }
}

export async function authMiddleware(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const authHeader = request.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return reply.status(401).send({ error: "Missing or invalid Authorization header" });
  }

  const token = authHeader.slice(7);

  try {
    const { payload } = await jwtVerify(token, jwks, {
      issuer: AUTH_ISSUER_URL,
      audience: AUTH_AUDIENCE,
    });

    if (!payload.sub) {
      return reply.status(401).send({ error: "Token missing sub claim" });
    }

    request.userId = payload.sub;
  } catch {
    return reply.status(401).send({ error: "Invalid or expired token" });
  }
}
