import { Search } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { dateOrDash } from "../../lib/display";
import type { OwnerPatient } from "../../types/api";
import { EmptyHint } from "../patient/ListBoundary";

export function PatientTable({ patients }: { patients: OwnerPatient[] }) {
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();
  const shown = patients.filter((p) => !q || p.name.toLowerCase().includes(q) || p.email.toLowerCase().includes(q) || (p.phone ?? "").includes(q));

  return (
    <div className="space-y-4">
      <div className="relative max-w-md">
        <label htmlFor="patient-search" className="sr-only">
          Search patients
        </label>
        <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" aria-hidden="true" />
        <input
          id="patient-search"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name, email or phone…"
          className="w-full rounded-full border border-slate-300 bg-white py-2.5 pl-12 pr-4 text-sm text-slate-800 focus-visible:outline-2 focus-visible:outline-brand-deep"
        />
      </div>

      {shown.length === 0 ? (
        <EmptyHint>No patients match your search.</EmptyHint>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-100 bg-white">
          <table className="w-full min-w-[36rem] text-left text-sm">
            <caption className="sr-only">Patients</caption>
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th scope="col" className="px-4 py-3 font-semibold">Patient</th>
                <th scope="col" className="px-4 py-3 font-semibold">Phone</th>
                <th scope="col" className="px-4 py-3 text-right font-semibold">Visits</th>
                <th scope="col" className="px-4 py-3 font-semibold">Last visit</th>
                <th scope="col" className="px-4 py-3 text-right font-semibold"><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {shown.map((p) => (
                <tr key={p.id}>
                  <td className="px-4 py-3">
                    <span className="block font-semibold text-brand-deep">{p.name}</span>
                    <span className="text-xs text-slate-500">{p.email}</span>
                  </td>
                  <td className="px-4 py-3">{p.phone ?? "–"}</td>
                  <td className="px-4 py-3 text-right">{p.appointmentCount ?? "–"}</td>
                  <td className="px-4 py-3 whitespace-nowrap">{dateOrDash(p.lastVisit)}</td>
                  <td className="px-4 py-3 text-right">
                    <Link to={`/owner/records?patientId=${encodeURIComponent(p.id)}`} className="font-semibold text-brand-strong hover:underline focus-visible:outline-2 focus-visible:outline-brand-deep">
                      Add record <span className="sr-only">for {p.name}</span>
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
