import { Link } from "react-router-dom";
import { dateOrDash } from "../../lib/display";
import { formatPaise } from "../../lib/format";
import type { MyInvoice } from "../../types/api";
import { Chip } from "./StatusBadge";

export function InvoiceTable({ invoices }: { invoices: MyInvoice[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[34rem] text-left text-sm">
        <caption className="sr-only">Your invoices</caption>
        <thead className="text-xs uppercase text-slate-500">
          <tr>
            <th scope="col" className="py-2 pr-3 font-semibold">Date</th>
            <th scope="col" className="py-2 pr-3 font-semibold">Description</th>
            <th scope="col" className="py-2 pr-3 font-semibold">Invoice</th>
            <th scope="col" className="py-2 pr-3 text-right font-semibold">Amount</th>
            <th scope="col" className="py-2 pr-3 font-semibold">Status</th>
            <th scope="col" className="py-2 text-right font-semibold"><span className="sr-only">View</span></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {invoices.map((inv) => (
            <tr key={inv.id}>
              <td className="py-3 pr-3 whitespace-nowrap">{dateOrDash(inv.issuedAt)}</td>
              <td className="py-3 pr-3">{inv.description}</td>
              <td className="py-3 pr-3 font-mono text-xs">{inv.number}</td>
              <td className="py-3 pr-3 text-right font-semibold text-brand-deep">{inv.amount === null ? "–" : formatPaise(inv.amount)}</td>
              <td className="py-3 pr-3">
                <Chip tone={inv.status === "PAID" ? "green" : "grey"}>{inv.status === "PAID" ? "Paid" : inv.status === "REFUNDED" ? "Refunded" : inv.status}</Chip>
              </td>
              <td className="py-3 text-right">
                <Link to={`/patient/invoices/${inv.id}`} className="font-semibold text-brand-strong hover:underline focus-visible:outline-2 focus-visible:outline-brand-deep">
                  View <span className="sr-only">invoice {inv.number}</span>
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
