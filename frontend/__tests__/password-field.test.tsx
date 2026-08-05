import { fireEvent, render, screen } from "@testing-library/react";

import { PasswordField, TemporaryPasswordNotice } from "@/components/password-field";

describe("password controls", () => {
  it("lets the user show and hide a password field", () => {
    render(<PasswordField label="Password" value="secret-value" onChange={jest.fn()} />);

    const input = screen.getByLabelText("Password");
    expect(input).toHaveAttribute("type", "password");

    fireEvent.click(screen.getByRole("button", { name: "Show password" }));
    expect(input).toHaveAttribute("type", "text");

    fireEvent.click(screen.getByRole("button", { name: "Hide password" }));
    expect(input).toHaveAttribute("type", "password");
  });

  it("keeps a newly generated password hidden until requested", () => {
    render(<TemporaryPasswordNotice accountLabel="user@example.test" password="generated-secret" onDismiss={jest.fn()} />);

    expect(screen.queryByText("generated-secret")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Show" }));
    expect(screen.getByText("generated-secret")).toBeInTheDocument();
  });
});
