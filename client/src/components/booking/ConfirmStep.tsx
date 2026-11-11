import { Info } from "lucide-react";
import { Button } from "../ui/Button";

type Props = {
  missing: string[];
  isPending: boolean;
  errorMessage: string | null;
  onReserve: () => void;
};

export function ConfirmStep({ missing, isPending, errorMessage, onReserve }: Props) {
  const ready = missing.length === 0;
  return (
    <div className="space-y-4">
      <p className="flex items-start gap-2 rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-brand-strong" aria-hidden="true" />
        We will hold your time for a few minutes while you pay on Stripe’s secure checkout (test mode). Payment confirms your appointment.
      </p>

      {!ready && (
        <p className="text-sm text-slate-600">
          Still needed: <strong>{missing.join(", ")}</strong>.
        </p>
      )}

      {errorMessage && (
        <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-800">
          {errorMessage}
        </p>
      )}

      <Button size="lg" className="w-full sm:w-auto" disabled={!ready || isPending} onClick={onReserve}>
        {isPending ? "Reserving…" : "Reserve my slot"}
      </Button>
    </div>
  );
}
