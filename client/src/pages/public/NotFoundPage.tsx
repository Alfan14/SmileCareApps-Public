import { ButtonLink } from "../../components/ui/Button";
import { Container } from "../../components/ui/Container";

export function NotFoundPage() {
  return (
    <section className="py-24">
      <Container className="text-center">
        <p className="text-sm font-semibold uppercase tracking-wide text-brand-strong">Error 404</p>
        <h1 className="mt-2 text-4xl font-bold">Page not found</h1>
        <p className="mx-auto mt-3 max-w-md text-slate-600">The page you are looking for does not exist or has moved.</p>
        <div className="mt-8">
          <ButtonLink to="/" size="lg">
            Back to home
          </ButtonLink>
        </div>
      </Container>
    </section>
  );
}
