import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";

import { AuthProvider, useAuth } from "@/components/auth-provider";

const signOut = jest.fn().mockResolvedValue(undefined);
const useSession = jest.fn();

jest.mock("next-auth/react", () => ({
  SessionProvider: ({ children }: { children: React.ReactNode }) => children,
  getSession: jest.fn(),
  signIn: jest.fn(),
  signOut: (...arguments_: unknown[]) => signOut(...arguments_),
  useSession: () => useSession(),
}));

function LogoutButton() {
  const { logout } = useAuth();
  return <button onClick={() => void logout()}>Log out</button>;
}

describe("AuthProvider expiry and logout", () => {
  beforeEach(() => {
    jest.useRealTimers();
    signOut.mockClear();
    useSession.mockReturnValue({ data: null, status: "authenticated", update: jest.fn() });
  });

  it("clears the NextAuth cookie when the API reports an invalid backend token", async () => {
    render(<AuthProvider><LogoutButton /></AuthProvider>);

    window.dispatchEvent(new Event("imagevault:authentication-expired"));

    await waitFor(() => expect(signOut).toHaveBeenCalledWith({ redirect: false }));
  });

  it("signs out when the known backend token expiry time is reached", async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2026-08-04T00:00:00.000Z"));
    useSession.mockReturnValue({
      data: { backendAccessTokenExpiresAt: Date.now() + 1_000 },
      status: "authenticated",
      update: jest.fn(),
    });
    render(<AuthProvider><LogoutButton /></AuthProvider>);

    await act(async () => { jest.advanceTimersByTime(1_000); });

    expect(signOut).toHaveBeenCalledWith({ redirect: false });
  });

  it("clears the NextAuth cookie during an explicit logout", async () => {
    render(<AuthProvider><LogoutButton /></AuthProvider>);

    fireEvent.click(screen.getByRole("button", { name: "Log out" }));

    await waitFor(() => expect(signOut).toHaveBeenCalledWith({ redirect: false }));
  });
});
