import { InvoiceTable } from "../../components/patient/InvoiceTable";
import { EmptyHint, ListBoundary } from "../../components/patient/ListBoundary";
import { SectionCard } from "../../components/patient/SectionCard";
import { useMyInvoices } from "../../hooks/usePatientData";
import { formatPaise } from "../../lib/format";

export function PatientPaymentsPage() {
  const query = useMyInvoices();
  const paid = (query.data ?? []).filter((i) => i.status === "PAID" && i.amount !== null).reduce((sum, i) => sum + (i.amount ?? 0), 0);

  return (
    <>
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Payments & invoices</h1>
        <p className="mt-1 text-slate-600">
          Every payment you made, with a printable invoice. Payments in this demo run in Stripe test mode, so no real money is charged.
        </p>
      </header>

      {query.data && query.data.length > 0 && (
        <p className="rounded-2xl bg-brand-soft/60 p-4 text-sm text-slate-700">
          Total paid: <strong className="text-brand-deep">{formatPaise(paid)}</strong>
        </p>
      )}

      <SectionCard title="Invoices">
        <ListBoundary query={query} skeletons={3} empty={<EmptyHint>Your invoices will appear here after your first payment.</EmptyHint>}>
          {(items) => <InvoiceTable invoices={items} />}
        </ListBoundary>
      </SectionCard>
    </>
  );
}
