import { api } from "@/lib/api";

describe("API authentication expiry", () => {
  afterEach(() => {
    delete (globalThis as { fetch?: typeof fetch }).fetch;
  });

  it("notifies the auth provider when a protected request returns 401", async () => {
    (globalThis as { fetch: typeof fetch }).fetch = jest.fn().mockResolvedValue({
      status: 401,
      ok: false,
      json: async () => ({ error: { code: "INVALID_TOKEN", message: "Expired" } }),
    }) as typeof fetch;
    const listener = jest.fn();
    window.addEventListener("imagevault:authentication-expired", listener);

    await expect(api.me()).rejects.toMatchObject({ status: 401, code: "INVALID_TOKEN" });
    expect(listener).toHaveBeenCalledTimes(1);
    expect(globalThis.fetch).toHaveBeenCalledWith(
      "/api/backend/api/auth/me",
      expect.objectContaining({ headers: expect.any(Headers) }),
    );
    const request = (globalThis.fetch as jest.Mock).mock.calls[0][1] as RequestInit;
    expect(new Headers(request.headers).has("Authorization")).toBe(false);

    window.removeEventListener("imagevault:authentication-expired", listener);
  });

  it("does not expire the session for unrelated API authorization errors", async () => {
    (globalThis as { fetch: typeof fetch }).fetch = jest.fn().mockResolvedValue({
      status: 401,
      ok: false,
      json: async () => ({ error: { code: "INVALID_CREDENTIALS", message: "Wrong password" } }),
    }) as typeof fetch;
    const listener = jest.fn();
    window.addEventListener("imagevault:authentication-expired", listener);

    await expect(api.me()).rejects.toMatchObject({ status: 401, code: "INVALID_CREDENTIALS" });
    expect(listener).not.toHaveBeenCalled();

    window.removeEventListener("imagevault:authentication-expired", listener);
  });
});
