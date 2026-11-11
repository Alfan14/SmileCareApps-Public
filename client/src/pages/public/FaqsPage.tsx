import { Search } from "lucide-react";
import { useMemo, useState } from "react";
import { FaqList } from "../../components/faq/FaqList";
import { BookingCta } from "../../components/home/BookingCta";
import { Button } from "../../components/ui/Button";
import { Container } from "../../components/ui/Container";
import { PageHero } from "../../components/ui/PageHero";
import { Skeleton } from "../../components/ui/Skeleton";
import { EmptyState, ErrorState } from "../../components/ui/StateMessage";
import { useFaqs } from "../../hooks/useContent";
import { cn } from "../../lib/cn";

export function FaqsPage() {
  const { data, isPending, isError, refetch } = useFaqs();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");

  const categories = useMemo(() => Array.from(new Set((data ?? []).map((f) => f.category))), [data]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (data ?? []).filter(
      (f) => (category === "all" || f.category === category) && (!q || f.question.toLowerCase().includes(q) || f.answer.toLowerCase().includes(q)),
    );
  }, [data, query, category]);

  return (
    <>
      <PageHero eyebrow="Frequently asked questions" title="Quick answers to common questions" text="Can’t find what you are looking for? Send us a message and we will help." />

      <section className="py-14 sm:py-16">
        <Container className="max-w-3xl">
          <div className="relative">
            <label htmlFor="faq-search" className="sr-only">
              Search questions
            </label>
            <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" aria-hidden="true" />
            <input
              id="faq-search"
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search questions…"
              className="w-full rounded-full border border-slate-300 bg-white py-3 pl-12 pr-4 text-sm text-slate-800 focus-visible:outline-2 focus-visible:outline-brand-deep"
            />
          </div>

          {categories.length > 1 && (
            <div className="mt-4 flex flex-wrap gap-2" role="group" aria-label="Filter by category">
              {["all", ...categories].map((c) => (
                <button
                  key={c}
                  type="button"
                  aria-pressed={category === c}
                  onClick={() => setCategory(c)}
                  className={cn(
                    "rounded-full px-4 py-1.5 text-sm font-medium capitalize focus-visible:outline-2 focus-visible:outline-brand-deep",
                    category === c ? "bg-brand-strong text-white" : "bg-brand-soft text-brand-deep hover:bg-brand-soft/70",
                  )}
                >
                  {c}
                </button>
              ))}
            </div>
          )}

          <div className="mt-8">
            {isPending && (
              <div className="space-y-3">
                {Array.from({ length: 5 }, (_, i) => (
                  <Skeleton key={i} className="h-16" />
                ))}
              </div>
            )}
            {isError && <ErrorState onRetry={() => void refetch()} />}
            {data && visible.length === 0 && (
              <EmptyState title="No matching questions" text="Try different words, or send us your question." />
            )}
            {visible.length > 0 && <FaqList faqs={visible} />}
            {data && query && visible.length === 0 && (
              <div className="mt-4 text-center">
                <Button variant="ghost" onClick={() => setQuery("")}>
                  Clear search
                </Button>
              </div>
            )}
          </div>
        </Container>
      </section>

      <BookingCta />
    </>
  );
}
