import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SignatureGem } from "../src/signature-gem";
import { TooltipProvider } from "../src/ui/tooltip";

function renderGem(ui: React.ReactElement) {
  return render(<TooltipProvider>{ui}</TooltipProvider>);
}

describe("SignatureGem", () => {
  it("renders as a span role=img when no onClick is provided", () => {
    renderGem(<SignatureGem state="verified" did="did:example:abc" />);
    const gem = screen.getByRole("img");
    expect(gem.tagName.toLowerCase()).toBe("span");
    expect(gem).toHaveAccessibleName(/Verified/);
    expect(gem).toHaveAccessibleName(/did:example:abc/);
  });

  it("renders as a button when onClick is provided", async () => {
    const onClick = vi.fn();
    const user = userEvent.setup();
    renderGem(<SignatureGem state="failed" onClick={onClick} />);
    const btn = screen.getByRole("button");
    expect(btn.tagName.toLowerCase()).toBe("button");
    await user.click(btn);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("renders all four trust states without throwing", () => {
    for (const state of ["verified", "warning", "failed", "pending"] as const) {
      const { unmount } = renderGem(<SignatureGem state={state} />);
      expect(screen.getByRole("img")).toHaveAccessibleName(new RegExp(state, "i"));
      unmount();
    }
  });

  it("falls back to 'pending' when state is an unknown string", () => {
    // Adversarial: untyped consumer passes garbage state.
    renderGem(
      // @ts-expect-error - testing runtime defense
      <SignatureGem state="__proto__" />,
    );
    expect(screen.getByRole("img")).toHaveAccessibleName(/Pending/);
  });

  it("escapes DID strings rendered into the tooltip aria-label", () => {
    const xss = "did:example:<script>window.__gemxss=true</script>";
    renderGem(<SignatureGem state="verified" did={xss} />);
    const gem = screen.getByRole("img");
    expect(gem.getAttribute("aria-label")).toContain(xss);
    expect((window as unknown as { __gemxss?: boolean }).__gemxss).toBeUndefined();
  });
});
