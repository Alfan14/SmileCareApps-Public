import { PatientTable } from "../../components/owner/PatientTable";
import { EmptyHint, ListBoundary } from "../../components/patient/ListBoundary";
import { useOwnerPatients } from "../../hooks/useOwnerData";

export function OwnerPatientsPage() {
  const query = useOwnerPatients();
  return (
    <>
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Patients</h1>
        <p className="mt-1 text-slate-600">Everyone who has an account at the clinic.</p>
      </header>
      <ListBoundary query={query} skeletons={4} empty={<EmptyHint>No patients have registered yet.</EmptyHint>}>
        {(items) => <PatientTable patients={items} />}
      </ListBoundary>
    </>
  );
}
