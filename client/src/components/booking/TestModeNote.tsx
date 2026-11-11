import { FlaskConical } from "lucide-react";

export function TestModeNote() {
  return (
    <div className="flex items-start gap-3 rounded-2xl bg-amber-50 p-4 text-left text-sm text-amber-900">
      <FlaskConical className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
      <p>
        <strong>Test mode.</strong> No real money is charged. On the Stripe page use card <span className="font-mono">4242 4242 4242 4242</span>, any future expiry date and any 3-digit security code.
      </p>
    </div>
  );
}
