import { api } from "@/lib/api";

describe("account, quota, and visibility API contracts", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("sends a current-password-confirmed self-service password change", async () => {
    const fetchMock = jest.fn().mockResolvedValue({ status: 204, ok: true });
    globalThis.fetch = fetchMock as typeof fetch;

    await api.changeOwnPassword("token", { currentPassword: "old-password", newPassword: "new-password" });

    const [url, request] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toContain("/api/auth/password");
    expect(request.method).toBe("PATCH");
    expect(JSON.parse(request.body as string)).toEqual({ currentPassword: "old-password", newPassword: "new-password" });
  });

  it("uses the organisation-scoped Admin password reset route", async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      status: 200,
      ok: true,
      json: async () => ({ admin: { id: "admin-id" } }),
    });
    globalThis.fetch = fetchMock as typeof fetch;

    await api.resetOrganisationAdminPassword("token", "organisation-id", "new-password");

    expect(fetchMock.mock.calls[0][0]).toContain("/api/organisations/organisation-id/admin/password");
    expect(JSON.parse(fetchMock.mock.calls[0][1].body as string)).toEqual({ newPassword: "new-password" });
  });

  it("allocates additional slots through the tenant-scoped User route", async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      status: 200,
      ok: true,
      json: async () => ({ user: { id: "user-id", imageQuota: 15 } }),
    });
    globalThis.fetch = fetchMock as typeof fetch;

    await api.allocateUserSlots("token", "user-id", 10);

    expect(fetchMock.mock.calls[0][0]).toContain("/api/users/user-id/slots");
    expect(JSON.parse(fetchMock.mock.calls[0][1].body as string)).toEqual({ additionalSlots: 10 });
  });

  it("includes explicit visibility when completing an image upload", async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      status: 201,
      ok: true,
      json: async () => ({ image: { id: "image-id", visibility: "PRIVATE" } }),
    });
    globalThis.fetch = fetchMock as typeof fetch;

    await api.completeUpload("token", { objectKey: "owned-key", tagUserIds: [], visibility: "PRIVATE" });

    expect(JSON.parse(fetchMock.mock.calls[0][1].body as string)).toEqual({
      objectKey: "owned-key",
      tagUserIds: [],
      visibility: "PRIVATE",
    });
  });

  it("creates and revokes uploader-managed public image links", async () => {
    const fetchMock = jest.fn()
      .mockResolvedValueOnce({
        status: 201,
        ok: true,
        json: async () => ({ share: { shareToken: "share-token" } }),
      })
      .mockResolvedValueOnce({ status: 204, ok: true });
    globalThis.fetch = fetchMock as typeof fetch;

    await api.createImageShare("token", "image-id");
    await api.revokeImageShare("token", "image-id");

    expect(fetchMock.mock.calls[0][0]).toContain("/api/images/image-id/share");
    expect(fetchMock.mock.calls[0][1].method).toBe("POST");
    expect(fetchMock.mock.calls[1][1].method).toBe("DELETE");
  });

  it("loads a shared image without an authentication token", async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      status: 200,
      ok: true,
      json: async () => ({ image: { id: "image-id", visibility: "PUBLIC" } }),
    });
    globalThis.fetch = fetchMock as typeof fetch;

    await api.publicSharedImage("url_safe-token");

    const [url, request] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toContain("/api/public/images/url_safe-token");
    expect(new Headers(request.headers).has("Authorization")).toBe(false);
  });
});
