import { render, waitFor } from "@testing-library/react";

import { ServiceWorkerRegistration } from "@/components/service-worker-registration";

describe("service worker registration", () => {
  const originalServiceWorker = navigator.serviceWorker;

  afterEach(() => {
    Object.defineProperty(navigator, "serviceWorker", {
      configurable: true,
      value: originalServiceWorker,
    });
    jest.restoreAllMocks();
  });

  it("unregisters stale workers instead of registering the PWA worker during development", async () => {
    const unregister = jest.fn().mockResolvedValue(true);
    const register = jest.fn();
    const getRegistrations = jest.fn().mockResolvedValue([{ unregister }]);

    Object.defineProperty(navigator, "serviceWorker", {
      configurable: true,
      value: { getRegistrations, register },
    });

    render(<ServiceWorkerRegistration />);

    await waitFor(() => expect(unregister).toHaveBeenCalledTimes(1));
    expect(getRegistrations).toHaveBeenCalledTimes(1);
    expect(register).not.toHaveBeenCalled();
  });
});
