import { render, screen } from "@testing-library/react";

import { PublicConfigProvider, usePublicConfig } from "@/components/public-config-provider";

const configuredResponse = {
  defaultImageQuota: 7,
  slotPackSize: 3,
  slotPackPriceInr: 75,
  maxSlotPacksPerOrder: 4,
  maxAdminSlotAllocation: 25,
  maxUserImageQuota: 1000,
  maxTagsPerImage: 2,
  maxFileSize: 1048576,
  notificationPollIntervalMs: 30000,
  passwordMinLength: 10,
  passwordMaxLength: 64,
  pushEnabled: false,
  vapidPublicKey: null,
};

function ConfigConsumer() {
  const { config, isLoading, error } = usePublicConfig();
  if (isLoading) return <p>Loading configuration</p>;
  if (error) return <p>{error}</p>;
  return <p>{config?.slotPackSize} slots for ₹{config?.slotPackPriceInr}</p>;
}

describe("public runtime configuration", () => {
  afterEach(() => {
    jest.restoreAllMocks();
    delete (globalThis as { fetch?: typeof fetch }).fetch;
  });

  it("loads business rules from the backend instead of UI constants", async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      status: 200,
      ok: true,
      json: async () => ({ config: configuredResponse }),
    });
    (globalThis as { fetch: typeof fetch }).fetch = fetchMock as typeof fetch;

    render(<PublicConfigProvider><ConfigConsumer /></PublicConfigProvider>);

    expect(screen.getByText("Loading configuration")).toBeInTheDocument();
    expect(await screen.findByText("3 slots for ₹75")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith("http://localhost:4000/api/config/public", expect.objectContaining({ cache: "no-store" }));
  });

  it("shows a safe error when configuration cannot be loaded", async () => {
    (globalThis as { fetch: typeof fetch }).fetch = jest.fn().mockRejectedValue(new Error("offline")) as typeof fetch;
    render(<PublicConfigProvider><ConfigConsumer /></PublicConfigProvider>);
    expect(await screen.findByText("Application configuration could not be loaded.")).toBeInTheDocument();
  });
});
