import { render, screen } from "@testing-library/react";

import { Message, PageHeader, StatCard } from "@/components/ui";

describe("dashboard UI", () => {
  it("renders a clear page heading and its supporting context", () => {
    render(<PageHeader eyebrow="Admin" title="Team members" description="Manage members and upload allowances." />);

    expect(screen.getByRole("heading", { name: "Team members" })).toBeInTheDocument();
    expect(screen.getByText("Manage members and upload allowances.")).toBeInTheDocument();
    expect(screen.getByText("Admin")).toBeInTheDocument();
  });

  it("renders quota information and accessible feedback", () => {
    render(
      <>
        <StatCard label="Available" value={3} detail="Uploads left" accent="emerald" />
        <Message tone="info">Your free uploads are used.</Message>
      </>,
    );

    expect(screen.getByText("Available")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getByText("Your free uploads are used.")).toBeInTheDocument();
  });
});
