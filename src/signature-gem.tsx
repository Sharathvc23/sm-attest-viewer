"use client";

import { Check, AlertTriangle, X, Hourglass } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";
import { cn } from "./lib/utils";
import type { TrustState } from "./types";

/**
 * SignatureGem — trust-state primitive.
 *
 * Renders an AAE's trust state as a 4-color gem with a hover tooltip
 * surfacing signer DID, key fingerprint, signed-at, and ledger
 * sequence when available. The visual contract is:
 *
 *   verified → --gem-verified (consumer's CSS variable, typically green)
 *   warning  → --gem-warning  (typically amber)
 *   failed   → --gem-failed   (typically red)
 *   pending  → --gem-pending  (typically gray)
 *
 * No animation on state change — operators interpret trust-gem flicker
 * as a system signal, not a delight beat.
 *
 * When `onClick` is provided the gem renders as a real `<button>` for
 * correct keyboard/screen-reader semantics. Without `onClick` it renders
 * as a non-interactive `<span role="img">`.
 */
export type SignatureGemProps = {
  state: TrustState;
  did?: string;
  keyFingerprint?: string;
  signedAt?: string;
  ledgerSequence?: number;
  size?: "sm" | "md";
  className?: string;
  /** Optional click handler — consumers wire this to open an evidence drill-in. */
  onClick?: () => void;
};

const STATE_COLOR: Record<TrustState, string> = {
  verified: "var(--gem-verified)",
  warning: "var(--gem-warning)",
  failed: "var(--gem-failed)",
  pending: "var(--gem-pending)",
};

const STATE_ICON = {
  verified: Check,
  warning: AlertTriangle,
  failed: X,
  pending: Hourglass,
} as const;

const STATE_LABEL: Record<TrustState, string> = {
  verified: "Verified",
  warning: "Warning",
  failed: "Failed verification",
  pending: "Pending verification",
};

export function SignatureGem({
  state,
  did,
  keyFingerprint,
  signedAt,
  ledgerSequence,
  size = "sm",
  className,
  onClick,
}: SignatureGemProps) {
  // Hardened lookups: defend against untrusted keys ending up in props by
  // falling back to "pending" if the state is not a known TrustState.
  const safeState: TrustState = Object.hasOwn(STATE_ICON, state) ? state : "pending";
  const Icon = STATE_ICON[safeState];
  const stateColor = STATE_COLOR[safeState];
  const stateLabel = STATE_LABEL[safeState];
  // Bump container/icon dimensions so a 3px-stroke icon stays legible.
  const containerDim = size === "md" ? "h-5 w-5" : "h-4 w-4";
  const iconDim = size === "md" ? "h-3 w-3" : "h-2.5 w-2.5";
  const ariaLabel = `${stateLabel}${did ? ` — ${did}` : ""}`;
  const sharedClasses = cn(
    "inline-flex items-center justify-center rounded-full text-white",
    containerDim,
    className,
  );

  const trigger = onClick ? (
    <button
      type="button"
      aria-label={ariaLabel}
      onClick={onClick}
      className={cn(
        sharedClasses,
        "cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2",
      )}
      style={{ background: stateColor }}
    >
      <Icon className={iconDim} strokeWidth={2.5} aria-hidden />
    </button>
  ) : (
    <span role="img" aria-label={ariaLabel} className={sharedClasses} style={{ background: stateColor }}>
      <Icon className={iconDim} strokeWidth={2.5} aria-hidden />
    </span>
  );

  if (!did && !keyFingerprint && !signedAt && ledgerSequence === undefined) {
    return trigger;
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>{trigger}</TooltipTrigger>
      <TooltipContent
        side="top"
        align="center"
        className="max-w-sm space-y-1.5 text-[12px] leading-snug"
      >
        <div className="flex items-center gap-1.5 font-semibold">
          <span
            className="inline-block h-1.5 w-1.5 rounded-full"
            style={{ background: stateColor }}
          />
          {stateLabel}
        </div>
        {did ? (
          <div className="flex flex-col">
            <span className="text-[10px] tracking-wide uppercase opacity-70">Signer</span>
            <span className="font-mono text-[11px] break-all">{did}</span>
          </div>
        ) : null}
        {keyFingerprint ? (
          <div className="flex flex-col">
            <span className="text-[10px] tracking-wide uppercase opacity-70">Key fingerprint</span>
            <span className="font-mono text-[11px] break-all">{keyFingerprint}</span>
          </div>
        ) : null}
        {signedAt ? (
          <div className="flex flex-col">
            <span className="text-[10px] tracking-wide uppercase opacity-70">Signed at</span>
            <span className="font-mono text-[11px]">{signedAt}</span>
          </div>
        ) : null}
        {ledgerSequence !== undefined ? (
          <div className="flex flex-col">
            <span className="text-[10px] tracking-wide uppercase opacity-70">Ledger seq</span>
            <span className="font-mono text-[11px]">#{ledgerSequence}</span>
          </div>
        ) : null}
        {onClick ? (
          <div className="pt-1 text-[10px] opacity-70">Click to inspect evidence →</div>
        ) : null}
      </TooltipContent>
    </Tooltip>
  );
}
