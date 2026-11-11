import { ButtonLink } from "../ui/Button";
import { Container } from "../ui/Container";
import { SectionHeading } from "../ui/SectionHeading";
import { TreatmentGrid } from "../treatments/TreatmentGrid";

export function TreatmentsPreview() {
  return (
    <section className="py-16 sm:py-20">
      <Container>
        <SectionHeading
          eyebrow="Our treatments"
          title="Complete dental care for a healthier, happier smile"
          subtitle="From preventive care to advanced treatments, everything you need for a healthy and confident smile."
        />
        <div className="mt-10">
          <TreatmentGrid limit={6} />
        </div>
        <div className="mt-10 text-center">
          <ButtonLink to="/treatments" variant="outline" size="lg">
            View all treatments
          </ButtonLink>
        </div>
      </Container>
    </section>
  );
}
