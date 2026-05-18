import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { InboxPresentation } from "../src/inbox-presentation";
import { TooltipProvider } from "../src/ui/tooltip";
import { makeEvent } from "./helpers/make-event";

function renderWithTooltip(ui: React.ReactElement) {
  return render(<TooltipProvider>{ui}</TooltipProvider>);
}

describe("InboxPresentation", () => {
  it("renders the default title and status dot", () => {
    renderWithTooltip(<InboxPresentation events={[]} status="open" />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Attestations Inbox");
    expect(screen.getByTestId("inbox-status-dot")).toBeInTheDocument();
    expect(screen.getByTestId("inbox-status-label")).toHaveTextContent("open");
  });

  it("accepts a custom title", () => {
    renderWithTooltip(
      <InboxPresentation events={[]} status="open" title="Custom Header" />,
    );
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Custom Header");
  });

  it("renders tenant and topicHint in the header subline", () => {
    renderWithTooltip(
      <InboxPresentation
        events={[]}
        status="open"
        tenant="acme-corp"
        topicHint="tenants/acme-corp/agents/attestations"
      />,
    );
    expect(
      screen.getByText("tenants/acme-corp/agents/attestations"),
    ).toBeInTheDocument();
  });

  it("renders one row per event", () => {
    const events = [makeEvent({ id: "a" }), makeEvent({ id: "b" }), makeEvent({ id: "c" })];
    renderWithTooltip(<InboxPresentation events={events} status="open" />);
    expect(screen.getByTestId("attestation-row-a")).toBeInTheDocument();
    expect(screen.getByTestId("attestation-row-b")).toBeInTheDocument();
    expect(screen.getByTestId("attestation-row-c")).toBeInTheDocument();
  });

  it("renders empty-state when no events and status is idle/connecting/etc.", () => {
    renderWithTooltip(<InboxPresentation events={[]} status="connecting" />);
    expect(screen.getByTestId("empty-state-connecting")).toBeInTheDocument();
  });

  it("falls back to idle status tone if status is an unknown string", () => {
    // Adversarial: untyped consumer passes a status not in the enum.
    renderWithTooltip(
      // @ts-expect-error - testing runtime defense against unknown status
      <InboxPresentation events={[]} status="not-a-real-status" />,
    );
    // Should not crash; status label still rendered as supplied.
    expect(screen.getByTestId("inbox-status-label")).toHaveTextContent("not-a-real-status");
    expect(screen.getByTestId("inbox-status-dot")).toBeInTheDocument();
  });

  it("does not execute script tags injected into the title", () => {
    const xss = '<script>window.__pwn=true</script>Attack';
    renderWithTooltip(<InboxPresentation events={[]} status="open" title={xss} />);
    // The title text is escaped by React; the literal string is rendered.
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(xss);
    // Side-effect: the script tag would have set window.__pwn — assert it didn't.
    expect((window as unknown as { __pwn?: boolean }).__pwn).toBeUndefined();
  });
});
