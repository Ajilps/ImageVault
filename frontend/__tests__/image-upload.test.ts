import { uploadFile } from "@/lib/api";

describe("direct image storage upload", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  const image = new File(["image-bytes"], "test.png", { type: "image/png" });

  it("uploads the file with the content type used to sign the request", async () => {
    const fetchMock = jest.fn().mockResolvedValue({ ok: true, status: 200 });
    globalThis.fetch = fetchMock as typeof fetch;

    await expect(uploadFile("http://storage.local/signed", image)).resolves.toBeUndefined();
    expect(fetchMock).toHaveBeenCalledWith("http://storage.local/signed", {
      method: "PUT",
      headers: { "Content-Type": "image/png" },
      body: image,
    });
  });

  it("explains browser endpoint or CORS failures", async () => {
    globalThis.fetch = jest.fn().mockRejectedValue(new TypeError("Failed to fetch")) as typeof fetch;

    await expect(uploadFile("http://storage.local/signed", image)).rejects.toMatchObject({
      status: 0,
      code: "STORAGE_UNREACHABLE",
      message: expect.stringContaining("bucket CORS"),
    });
  });

  it("explains a missing storage bucket", async () => {
    globalThis.fetch = jest.fn().mockResolvedValue({ ok: false, status: 404 }) as typeof fetch;

    await expect(uploadFile("http://storage.local/signed", image)).rejects.toMatchObject({
      status: 404,
      code: "STORAGE_UPLOAD_FAILED",
      message: expect.stringContaining("bucket was not found"),
    });
  });
});
