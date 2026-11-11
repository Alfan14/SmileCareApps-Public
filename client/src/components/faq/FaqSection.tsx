import { useFaqs } from "../../hooks/useContent";
import { ButtonLink } from "../ui/Button";
import { Container } from "../ui/Container";
import { SectionHeading } from "../ui/SectionHeading";
import { Skeleton } from "../ui/Skeleton";
import { EmptyState, ErrorState } from "../ui/StateMessage";
import { FaqList } from "./FaqList";

export function FaqSection({ limit = 3, showAllLink = true }: { limit?: number; showAllLink?: boolean }) {
  const { data, isPending, isError, refetch } = useFaqs();

  return (
    <section className="py-16 sm:py-20">
      <Container className="max-w-3xl">
        <SectionHeading eyebrow="Frequently asked questions" title="Quick answers" subtitle="Short answers to the questions patients ask most." />
        <div className="mt-10">
          {isPending && (
            <div className="space-y-3">
              {Array.from({ length: limit }, (_, i) => (
                <Skeleton key={i} className="h-16" />
              ))}
            </div>
          )}
          {isError && <ErrorState onRetry={() => void refetch()} />}
          {data && data.length === 0 && <EmptyState title="No questions yet" text="Please check back soon." />}
          {data && data.length > 0 && <FaqList faqs={data.slice(0, limit)} />}
        </div>
        {showAllLink && (
          <div className="mt-8 text-center">
            <ButtonLink to="/faqs" variant="outline">
              View all FAQs
            </ButtonLink>
          </div>
        )}
      </Container>
    </section>
  );
}
