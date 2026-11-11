import type { ReactNode } from "react";
import { Container } from "../ui/Container";

type Props = { icon: ReactNode; title: string; subtitle: string; children: ReactNode; footer: ReactNode };

export function AuthShell({ icon, title, subtitle, children, footer }: Props) {
  return (
    <section className="bg-gradient-to-b from-brand-soft to-white py-12 sm:py-16">
      <Container className="max-w-md">
        <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-xl sm:p-8">
          <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-brand-soft text-brand-deep">{icon}</span>
          <h1 className="mt-4 text-center text-2xl font-bold">{title}</h1>
          <p className="mt-1 text-center text-sm text-slate-600">{subtitle}</p>
          <div className="mt-6">{children}</div>
        </div>
        <p className="mt-6 text-center text-sm text-slate-600">{footer}</p>
      </Container>
    </section>
  );
}
