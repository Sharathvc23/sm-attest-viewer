import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { EmptyState } from "../src/empty-state";

describe("EmptyState", () => {
  it("renders the filtered-out message when isFilteredOut is true", () => {
    render(<EmptyState status="open" isFilteredOut={true} />);
    expect(screen.getByTestId("empty-state-filtered")).toBeInTheDocument();
    expect(screen.getByText(/No attestations match/i)).toBeInTheDocument();
  });

  it("renders status-specific copy for each ConnectionStatus", () => {
    const statuses = ["idle", "connecting", "open", "reconnecting", "closed", "error"] as const;
    for (const s of statuses) {
      const { unmount } = render(<EmptyState status={s} isFilteredOut={false} />);
      expect(screen.getByTestId(`empty-state-${s}`)).toBeInTheDocument();
      unmount();
    }
  });
});
