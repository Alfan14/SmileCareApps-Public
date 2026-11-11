import { AlertCircle, Inbox } from "lucide-react";
import { Button } from "./Button";

export function ErrorState({ message = "Something went wrong while loading this section.", onRetry }: { message?: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="mx-auto flex max-w-md flex-col items-center gap-3 rounded-2xl border border-red-100 bg-red-50 p-6 text-center">
      <AlertCircle className="h-6 w-6 text-red-600" aria-hidden="true" />
      <p className="text-sm text-red-800">{message}</p>
      {onRetry && (
        <Button variant="outline" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}

export function EmptyState({ title, text }: { title: string; text?: string }) {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-2 rounded-2xl border border-dashed border-slate-300 p-8 text-center">
      <Inbox className="h-6 w-6 text-slate-400" aria-hidden="true" />
      <p className="font-semibold text-brand-deep">{title}</p>
      {text && <p className="text-sm text-slate-600">{text}</p>}
    </div>
  );
}
