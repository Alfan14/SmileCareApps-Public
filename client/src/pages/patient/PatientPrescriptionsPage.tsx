import { EmptyHint, ListBoundary } from "../../components/patient/ListBoundary";
import { PrescriptionItem } from "../../components/patient/PrescriptionItem";
import { useMyPrescriptions } from "../../hooks/usePatientData";

export function PatientPrescriptionsPage() {
  const query = useMyPrescriptions();
  return (
    <>
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Prescriptions & care notes</h1>
        <p className="mt-1 text-slate-600">Medicines and instructions from your dentist, newest first.</p>
      </header>
      <ListBoundary query={query} skeletons={3} empty={<EmptyHint>No prescriptions yet.</EmptyHint>}>
        {(items) => (
          <div className="space-y-3">
            {[...items]
              .sort((a, b) => Date.parse(b.date ?? "") - Date.parse(a.date ?? "") || 0)
              .map((p) => (
                <PrescriptionItem key={p.id} prescription={p} />
              ))}
          </div>
        )}
      </ListBoundary>
      <p className="text-sm text-slate-500">Always follow your dentist’s instructions. If something is unclear or you feel unwell, please contact the clinic.</p>
    </>
  );
}
