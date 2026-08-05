import type { JWT } from "next-auth/jwt";

export function getValidBackendAccessToken(token: JWT | null, now = Date.now()): string | null {
  if (
    typeof token?.backendAccessToken !== "string" ||
    typeof token.backendAccessTokenExpiresAt !== "number" ||
    token.backendAccessTokenExpiresAt <= now
  ) {
    return null;
  }

  return token.backendAccessToken;
}
