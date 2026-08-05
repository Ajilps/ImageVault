import type { Session } from "next-auth";
import type { JWT } from "next-auth/jwt";

import { authOptions } from "@/auth";
import type { CurrentUser } from "@/lib/types";

const user: CurrentUser = {
  id: "user-id",
  name: "Test User",
  email: "user@example.test",
  role: "USER",
  imageQuota: 10,
  organizationId: "organisation-id",
  organization: { id: "organisation-id", name: "Test Organisation" },
  createdAt: "2026-08-04T00:00:00.000Z",
};

async function buildSession(token: JWT): Promise<Session> {
  const callback = authOptions.callbacks?.session;
  if (!callback) throw new Error("The session callback must be configured.");

  return await callback({
    session: { user, expires: "2099-01-01T00:00:00.000Z" },
    token,
  } as Parameters<typeof callback>[0]) as Session;
}

describe("NextAuth backend session", () => {
  it("keeps the backend access token out of the browser-visible session", async () => {
    const expiresAt = Date.now() + 60_000;
    const session = await buildSession({
      backendAccessToken: "server-only-token",
      backendAccessTokenExpiresAt: expiresAt,
      imageVaultUser: user,
    });

    expect(session.user).toEqual(user);
    expect(session.backendAccessTokenExpiresAt).toBe(expiresAt);
    expect(session).not.toHaveProperty("backendAccessToken");
    expect(session.authError).toBeUndefined();
  });

  it("marks a browser session invalid once the backend token has expired", async () => {
    const session = await buildSession({
      backendAccessToken: "expired-server-only-token",
      backendAccessTokenExpiresAt: Date.now() - 1,
      imageVaultUser: user,
    });

    expect(session.authError).toBe("BACKEND_TOKEN_EXPIRED");
    expect(session).not.toHaveProperty("backendAccessToken");
  });
});
