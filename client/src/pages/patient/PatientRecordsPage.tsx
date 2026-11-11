import { EmptyHint, ListBoundary } from "../../components/patient/ListBoundary";
import { RecordItem } from "../../components/patient/RecordItem";
import { useMyRecords } from "../../hooks/usePatientData";

export function PatientRecordsPage() {
  const query = useMyRecords();
  return (
    <>
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Treatment records</h1>
        <p className="mt-1 text-slate-600">A summary of the treatment you received, newest first.</p>
      </header>
      <ListBoundary query={query} skeletons={3} empty={<EmptyHint>No treatment records yet. The dentist adds them after your visit.</EmptyHint>}>
        {(items) => (
          <div className="space-y-3">
            {[...items]
              .sort((a, b) => Date.parse(b.date ?? "") - Date.parse(a.date ?? "") || 0)
              .map((r) => (
                <RecordItem key={r.id} record={r} />
              ))}
          </div>
        )}
      </ListBoundary>
    </>
  );
}
