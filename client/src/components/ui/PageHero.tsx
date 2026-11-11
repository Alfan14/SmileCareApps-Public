import type { ReactNode } from "react";
import { Container } from "./Container";

type Props = { eyebrow: string; title: ReactNode; text: string; children?: ReactNode };

export function PageHero({ eyebrow, title, text, children }: Props) {
  return (
    <section className="bg-gradient-to-b from-brand-soft to-white">
      <Container className="py-14 text-center sm:py-20">
        <p className="mb-3 inline-block rounded-full bg-white px-3 py-1 text-xs font-semibold uppercase tracking-wide text-brand-deep shadow-sm">
          {eyebrow}
        </p>
        <h1 className="mx-auto max-w-3xl text-4xl font-bold tracking-tight sm:text-5xl">{title}</h1>
        <p className="mx-auto mt-4 max-w-2xl text-base text-slate-600 sm:text-lg">{text}</p>
        {children && <div className="mt-6 flex flex-wrap justify-center gap-3">{children}</div>}
      </Container>
    </section>
  );
}
