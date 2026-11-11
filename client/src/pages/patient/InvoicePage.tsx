import { ArrowLeft, Printer } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import type { ApiError } from "../../api/client";
import { Chip } from "../../components/patient/StatusBadge";
import { Button, ButtonLink } from "../../components/ui/Button";
import { Skeleton } from "../../components/ui/Skeleton";
import { ErrorState } from "../../components/ui/StateMessage";
import { useCurrentUser } from "../../hooks/useAuth";
import { useInvoice } from "../../hooks/usePatientData";
import { clinic } from "../../lib/clinic";
import { dateOrDash } from "../../lib/display";
import { formatPaise } from "../../lib/format";

/** One invoice, laid out to print. "Print / Save as PDF" uses the browser, so no server PDF is needed. */
export function InvoicePage() {
  const { id = "" } = useParams();
  const { user } = useCurrentUser();
  const query = useInvoice(id);

  return (
    <>
      <div className="print:hidden">
        <Link to="/patient/payments" className="inline-flex items-center gap-2 text-sm font-medium text-brand-deep hover:underline">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          All invoices
        </Link>
      </div>

      {query.isPending && <Skeleton className="h-96" />}

      {query.isError &&
        ((query.error as ApiError).status === 404 ? (
          <div className="rounded-3xl bg-white p-8 text-center shadow-sm">
            <h1 className="text-2xl font-bold">Invoice not found</h1>
            <p className="mt-2 text-slate-600">We could not find this invoice in your account.</p>
            <div className="mt-6">
              <ButtonLink to="/patient/payments">View my invoices</ButtonLink>
            </div>
          </div>
        ) : (
          <ErrorState onRetry={() => void query.refetch()} />
        ))}

      {query.data && (
        <article className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm sm:p-10 print:rounded-none print:border-0 print:p-0 print:shadow-none">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xl font-bold text-brand-deep">{clinic.name}</p>
              <p className="mt-1 max-w-xs text-sm text-slate-600">{clinic.address}</p>
              <p className="text-sm text-slate-600">
                {clinic.phone} · {clinic.email}
              </p>
            </div>
            <div className="text-right">
              <h1 className="text-3xl font-bold tracking-tight">Invoice</h1>
              <p className="mt-1 font-mono text-sm">{query.data.number}</p>
              <p className="text-sm text-slate-600">{dateOrDash(query.data.issuedAt)}</p>
            </div>
          </div>

          <div className="mt-8 grid gap-6 sm:grid-cols-2">
            <div>
              <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Billed to</h2>
              <p className="mt-1 font-semibold text-slate-800">{query.data.patientName ?? user?.name}</p>
              <p className="text-sm text-slate-600">{query.data.patientEmail ?? user?.email}</p>
            </div>
            <div className="sm:text-right">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Status</h2>
              <p className="mt-1">
                <Chip tone={query.data.status === "PAID" ? "green" : "grey"}>{query.data.status === "PAID" ? "Paid" : query.data.status === "REFUNDED" ? "Refunded" : query.data.status}</Chip>
              </p>
            </div>
          </div>

          <table className="mt-8 w-full text-left text-sm">
            <thead className="border-b border-slate-200 text-xs uppercase text-slate-500">
              <tr>
                <th scope="col" className="py-2 font-semibold">Description</th>
                <th scope="col" className="py-2 text-right font-semibold">Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-slate-100">
                <td className="py-3">{query.data.description}</td>
                <td className="py-3 text-right">{query.data.amount === null ? "–" : formatPaise(query.data.amount)}</td>
              </tr>
            </tbody>
            <tfoot>
              <tr>
                <th scope="row" className="pt-4 text-right text-slate-600">Total</th>
                <td className="pt-4 text-right text-lg font-bold text-brand-deep">{query.data.amount === null ? "–" : formatPaise(query.data.amount)}</td>
              </tr>
            </tfoot>
          </table>

          <p className="mt-10 text-xs text-slate-500">Demo document. Payments in this project run in Stripe test mode, so no real money was charged.</p>

          <div className="mt-6 print:hidden">
            <Button size="lg" onClick={() => window.print()}>
              <Printer className="h-5 w-5" aria-hidden="true" />
              Print / Save as PDF
            </Button>
          </div>
        </article>
      )}
    </>
  );
}
