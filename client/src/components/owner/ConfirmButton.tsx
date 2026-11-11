import { useState } from "react";
import { Button } from "../ui/Button";

type Props = { label: string; confirmLabel: string; onConfirm: () => void; disabled?: boolean };

/** A risky action (like cancelling a booking) needs a second press, so a mis-tap does no harm. */
export function ConfirmButton({ label, confirmLabel, onConfirm, disabled }: Props) {
  const [armed, setArmed] = useState(false);

  if (!armed) {
    return (
      <Button variant="outline" onClick={() => setArmed(true)} disabled={disabled}>
        {label}
      </Button>
    );
  }
  return (
    <span className="inline-flex items-center gap-1" role="group" aria-label={`Confirm: ${label}`}>
      <Button
        onClick={() => {
          setArmed(false);
          onConfirm();
        }}
        disabled={disabled}
      >
        {confirmLabel}
      </Button>
      <Button variant="ghost" onClick={() => setArmed(false)}>
        Keep
      </Button>
    </span>
  );
}
