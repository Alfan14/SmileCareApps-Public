import { ShieldAlert } from "lucide-react";
import { ButtonLink } from "../../components/ui/Button";
import { Container } from "../../components/ui/Container";
import { useCurrentUser } from "../../hooks/useAuth";
import { homeFor } from "../../lib/roles";

export function ForbiddenPage() {
  const { user } = useCurrentUser();
  return (
    <section className="py-24">
      <Container className="text-center">
        <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-red-50 text-red-700">
          <ShieldAlert className="h-7 w-7" aria-hidden="true" />
        </span>
        <h1 className="mt-5 text-4xl font-bold">You do not have access to this page</h1>
        <p className="mx-auto mt-3 max-w-md text-slate-600">This area is for a different type of account. If you think this is a mistake, please contact the clinic.</p>
        <div className="mt-8">
          <ButtonLink to={user ? homeFor(user.role) : "/"} size="lg">
            {user ? "Go to my dashboard" : "Back to home"}
          </ButtonLink>
        </div>
      </Container>
    </section>
  );
}
