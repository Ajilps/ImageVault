import { getValidBackendAccessToken } from "@/lib/backend-auth";

describe("backend access token expiry", () => {
  it("returns a token only while its backend expiry is in the future", () => {
    const token = {
      backendAccessToken: "server-only-token",
      backendAccessTokenExpiresAt: 2_000,
    };

    expect(getValidBackendAccessToken(token, 1_999)).toBe("server-only-token");
    expect(getValidBackendAccessToken(token, 2_000)).toBeNull();
    expect(getValidBackendAccessToken(token, 2_001)).toBeNull();
  });

  it("rejects incomplete NextAuth JWT state", () => {
    expect(getValidBackendAccessToken({ backendAccessToken: "token-without-expiry" }, 1_000)).toBeNull();
    expect(getValidBackendAccessToken(null, 1_000)).toBeNull();
  });
});
