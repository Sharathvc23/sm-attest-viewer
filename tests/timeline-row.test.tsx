import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TimelineRow } from "../src/timeline-row";
import { TooltipProvider } from "../src/ui/tooltip";
import { makeEvent } from "./helpers/make-event";

function renderRow(ui: React.ReactElement) {
  return render(<TooltipProvider>{ui}</TooltipProvider>);
}

describe("TimelineRow", () => {
  it("renders kind, classification, agent label, and time", () => {
    const event = makeEvent({
      id: "row-1",
      classification: "internal",
      payload: { ...makeEvent().payload, kind: "image_verified" },
    });
    renderRow(<TimelineRow event={event} />);
    expect(screen.getByTestId("attestation-row-row-1")).toBeInTheDocument();
    expect(screen.getByText("image_verified")).toBeInTheDocument();
    expect(screen.getByText("internal")).toBeInTheDocument();
    expect(screen.getByText("ops/image-attestor")).toBeInTheDocument();
  });

  it("falls back to 'attested' when kind is missing", () => {
    const event = makeEvent({
      payload: { ...makeEvent().payload, kind: undefined },
    });
    renderRow(<TimelineRow event={event} />);
    expect(screen.getByText("attested")).toBeInTheDocument();
  });

  it("truncates long image digests", () => {
    const event = makeEvent({
      payload: {
        ...makeEvent().payload,
        image_digest: "sha256:abcdefghijklmnopqrstuvwxyz0123456789",
      },
    });
    renderRow(<TimelineRow event={event} />);
    expect(screen.getByText(/sha256:abcdefghi/)).toBeInTheDocument();
    expect(screen.getByText(/…/)).toBeInTheDocument();
  });

  it("renders ??:??:?? when timestamp is malformed", () => {
    const event = makeEvent({ id: "bad-ts", ts: "not-a-real-date" });
    renderRow(<TimelineRow event={event} />);
    expect(screen.getByText(/\?\?:\?\?:\?\?Z/)).toBeInTheDocument();
  });

  it("renders correlation chip only when callback provided", () => {
    const event = makeEvent({ id: "row-c", trace_id: "trace-xyz" });
    const onClick = vi.fn();
    const { rerender } = renderRow(<TimelineRow event={event} />);
    expect(screen.queryByTestId("correlation-chip-trace-xyz")).toBeNull();
    rerender(
      <TooltipProvider>
        <TimelineRow event={event} onCorrelationClick={onClick} />
      </TooltipProvider>,
    );
    expect(screen.getByTestId("correlation-chip-trace-xyz")).toBeInTheDocument();
  });

  it("invokes onCorrelationClick with the trace id", async () => {
    const event = makeEvent({ trace_id: "trace-clicked" });
    const onClick = vi.fn();
    const user = userEvent.setup();
    renderRow(<TimelineRow event={event} onCorrelationClick={onClick} />);
    await user.click(screen.getByTestId("correlation-chip-trace-clicked"));
    expect(onClick).toHaveBeenCalledWith("trace-clicked");
  });

  it("does not crash on a malicious classification label", () => {
    // Adversarial: classification with prototype-pollution-style key.
    const event = makeEvent({
      id: "evil-class",
      classification: "__proto__",
    });
    expect(() => renderRow(<TimelineRow event={event} />)).not.toThrow();
    expect(screen.getByTestId("attestation-row-evil-class")).toBeInTheDocument();
  });

  it("escapes script tags in actor display names", () => {
    const event = makeEvent({
      id: "xss-actor",
      actor: {
        namespace: "ops",
        value: "<script>window.__xss=true</script>",
        did: null,
        display_name: null,
      },
      payload: { ...makeEvent().payload, subject: undefined },
    });
    renderRow(<TimelineRow event={event} />);
    expect((window as unknown as { __xss?: boolean }).__xss).toBeUndefined();
  });

  it("survives a non-string image_digest gracefully", () => {
    const event = makeEvent({
      id: "weird-digest",
      payload: {
        ...makeEvent().payload,
        // @ts-expect-error - testing runtime defense
        image_digest: 12345,
      },
    });
    expect(() => renderRow(<TimelineRow event={event} />)).not.toThrow();
    expect(screen.getByTestId("attestation-row-weird-digest")).toBeInTheDocument();
  });

  describe("envelope-kind badge (SPEC §13)", () => {
    it("does not render a kind badge for action / legacy envelopes", () => {
      const legacy = makeEvent({ id: "legacy", type: "EVIDENCE" });
      renderRow(<TimelineRow event={legacy} />);
      const row = screen.getByTestId("attestation-row-legacy");
      expect(row.dataset.envelopeKind).toBe("action");
      expect(screen.queryByTestId("envelope-kind-badge-action")).toBeNull();
      expect(screen.queryByTestId("envelope-kind-badge-decision")).toBeNull();
    });

    it("renders a decision badge for type='decision'", () => {
      const event = makeEvent({ id: "dec", type: "decision" });
      renderRow(<TimelineRow event={event} />);
      expect(screen.getByTestId("envelope-kind-badge-decision")).toBeInTheDocument();
      expect(screen.getByTestId("attestation-row-dec").dataset.envelopeKind).toBe("decision");
    });

    it("renders a belief badge for type='belief'", () => {
      const event = makeEvent({ id: "bel", type: "belief" });
      renderRow(<TimelineRow event={event} />);
      expect(screen.getByTestId("envelope-kind-badge-belief")).toBeInTheDocument();
    });

    it("renders a checkpoint badge for type='checkpoint'", () => {
      const event = makeEvent({ id: "chk", type: "checkpoint" });
      renderRow(<TimelineRow event={event} />);
      expect(screen.getByTestId("envelope-kind-badge-checkpoint")).toBeInTheDocument();
    });
  });
});
