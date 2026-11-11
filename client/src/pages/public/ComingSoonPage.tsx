import { Hammer } from "lucide-react";
import { ButtonLink } from "../../components/ui/Button";
import { Container } from "../../components/ui/Container";

type Props = { title: string; sprint: string };

/** Placeholder so navigation links never dead-end while later sprints are built. */
export function ComingSoonPage({ title, sprint }: Props) {
  return (
    <section className="py-24">
      <Container className="text-center">
        <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-brand-soft text-brand-deep">
          <Hammer className="h-7 w-7" aria-hidden="true" />
        </span>
        <h1 className="mt-5 text-4xl font-bold">{title}</h1>
        <p className="mx-auto mt-3 max-w-md text-slate-600">
          This feature is planned for <strong>{sprint}</strong> and is not built yet. You can follow the progress in the repository.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <ButtonLink to="/" size="lg">
            Back to home
          </ButtonLink>
          <ButtonLink to="/contact" variant="outline" size="lg">
            Contact the clinic
          </ButtonLink>
        </div>
      </Container>
    </section>
  );
}
