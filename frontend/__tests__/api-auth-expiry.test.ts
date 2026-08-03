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

    await expect(api.me("expired-token")).rejects.toMatchObject({ status: 401, code: "INVALID_TOKEN" });
    expect(listener).toHaveBeenCalledTimes(1);

    window.removeEventListener("imagevault:authentication-expired", listener);
  });
});
