import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Filters } from "../src/filters";
import { EMPTY_FILTER } from "../src/types";

describe("Filters", () => {
  const baseProps = {
    filter: EMPTY_FILTER,
    setFilter: vi.fn(),
    availableKinds: ["image_verified", "intent_signed"],
    availableClassifications: ["public", "internal"],
    totalCount: 10,
    visibleCount: 10,
  };

  it("renders actor query input + count summary", () => {
    render(<Filters {...baseProps} />);
    expect(screen.getByTestId("filter-actor-query")).toBeInTheDocument();
    expect(screen.getByText("10 / 10")).toBeInTheDocument();
  });

  it("calls setFilter when the actor query input changes", async () => {
    const setFilter = vi.fn();
    const user = userEvent.setup();
    render(<Filters {...baseProps} setFilter={setFilter} />);
    await user.type(screen.getByTestId("filter-actor-query"), "x");
    expect(setFilter).toHaveBeenLastCalledWith(
      expect.objectContaining({ actorQuery: "x" }),
    );
  });

  it("renders trust filter chips for all four states", () => {
    render(<Filters {...baseProps} />);
    for (const state of ["verified", "pending", "warning", "failed"]) {
      expect(screen.getByTestId(`filter-trust-${state}`)).toBeInTheDocument();
    }
  });

  it("toggles a trust chip via setFilter", async () => {
    const setFilter = vi.fn();
    const user = userEvent.setup();
    render(<Filters {...baseProps} setFilter={setFilter} />);
    await user.click(screen.getByTestId("filter-trust-verified"));
    expect(setFilter).toHaveBeenCalledWith(
      expect.objectContaining({ trustStates: ["verified"] }),
    );
  });

  it("does not render the classification group when no labels available", () => {
    render(<Filters {...baseProps} availableClassifications={[]} />);
    expect(screen.queryByTestId("filter-classification")).toBeNull();
  });

  it("toggles a classification chip via setFilter", async () => {
    const setFilter = vi.fn();
    const user = userEvent.setup();
    render(<Filters {...baseProps} setFilter={setFilter} />);
    await user.click(screen.getByTestId("filter-classification-public"));
    expect(setFilter).toHaveBeenCalledWith(
      expect.objectContaining({ classifications: ["public"] }),
    );
  });

  it("toggles a kind chip via setFilter", async () => {
    const setFilter = vi.fn();
    const user = userEvent.setup();
    render(<Filters {...baseProps} setFilter={setFilter} />);
    await user.click(screen.getByTestId("filter-kind-image_verified"));
    expect(setFilter).toHaveBeenCalledWith(
      expect.objectContaining({ kinds: ["image_verified"] }),
    );
  });

  it("removes a trust state on second click (toggle off)", async () => {
    const setFilter = vi.fn();
    const user = userEvent.setup();
    render(
      <Filters
        {...baseProps}
        setFilter={setFilter}
        filter={{ ...EMPTY_FILTER, trustStates: ["verified"] }}
      />,
    );
    await user.click(screen.getByTestId("filter-trust-verified"));
    expect(setFilter).toHaveBeenCalledWith(
      expect.objectContaining({ trustStates: [] }),
    );
  });

  it("shows the Clear button only when filter is dirty", async () => {
    const setFilter = vi.fn();
    const { rerender } = render(<Filters {...baseProps} setFilter={setFilter} />);
    expect(screen.queryByTestId("filter-clear")).toBeNull();
    rerender(
      <Filters
        {...baseProps}
        setFilter={setFilter}
        filter={{ ...EMPTY_FILTER, actorQuery: "hi" }}
      />,
    );
    expect(screen.getByTestId("filter-clear")).toBeInTheDocument();
    const user = userEvent.setup();
    await user.click(screen.getByTestId("filter-clear"));
    expect(setFilter).toHaveBeenCalledWith(EMPTY_FILTER);
  });
});
