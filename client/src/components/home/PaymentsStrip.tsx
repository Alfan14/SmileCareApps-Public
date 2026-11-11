import { CreditCard, Lock } from "lucide-react";
import { Container } from "../ui/Container";

export function PaymentsStrip() {
  return (
    <section aria-label="Online payments" className="border-y border-slate-100 bg-white">
      <Container className="flex flex-col items-start gap-4 py-8 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-brand-soft text-brand-deep">
            <CreditCard className="h-6 w-6" aria-hidden="true" />
          </span>
          <div>
            <h2 className="text-lg font-bold">Online payments</h2>
            <p className="text-sm text-slate-600">Pay securely and conveniently for your appointment by card.</p>
          </div>
        </div>
        <p className="flex items-center gap-2 rounded-full bg-brand-soft px-4 py-2 text-sm font-medium text-brand-deep">
          <Lock className="h-4 w-4" aria-hidden="true" />
          Secure checkout by Stripe (test mode in this demo)
        </p>
      </Container>
    </section>
  );
}
