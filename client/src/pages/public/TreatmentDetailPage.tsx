import { ArrowLeft, Clock, CreditCard, Tag } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import type { ApiError } from "../../api/client";
import { BookingCta } from "../../components/home/BookingCta";
import { TreatmentIcon } from "../../components/treatments/TreatmentIcon";
import { ButtonLink } from "../../components/ui/Button";
import { Container } from "../../components/ui/Container";
import { Skeleton } from "../../components/ui/Skeleton";
import { ErrorState } from "../../components/ui/StateMessage";
import { useTreatment } from "../../hooks/useContent";
import { formatDuration, formatPaise, formatPriceRange } from "../../lib/format";
import { treatmentImageFor } from "../../lib/clinicImages";
import { ClinicImage } from "../../components/ui/ClinicImage";

export function TreatmentDetailPage() {
  const { slug = "" } = useParams();
  const { data, isPending, isError, error, refetch } = useTreatment(slug);
  const notFound = isError && (error as ApiError).status === 404;

  return (
    <>
      <section className="py-12 sm:py-16">
        <Container className="max-w-4xl">
          <Link to="/treatments" className="inline-flex items-center gap-2 text-sm font-medium text-brand-deep hover:underline">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            All treatments
          </Link>

          {isPending && <Skeleton className="mt-6 h-72" />}

          {notFound && (
            <div className="mt-8 text-center">
              <h1 className="text-3xl font-bold">Treatment not found</h1>
              <p className="mt-2 text-slate-600">We could not find that treatment. Please pick one from our list.</p>
              <div className="mt-6">
                <ButtonLink to="/treatments">View all treatments</ButtonLink>
              </div>
            </div>
          )}

          {isError && !notFound && (
            <div className="mt-8">
              <ErrorState onRetry={() => void refetch()} />
            </div>
          )}

          {data && (
            <article className="mt-6 overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-sm">
              <div className="relative aspect-[16/8] overflow-hidden bg-brand-soft">
                <ClinicImage
                  src={treatmentImageFor(data.slug)}
                  alt={`${data.name} dental treatment`}
                  className="h-full w-full object-cover"
                />
                <span className="absolute bottom-4 left-4 grid h-12 w-12 place-items-center rounded-2xl border border-white/70 bg-white/95 text-brand-deep shadow-lg">
                  <TreatmentIcon slug={data.slug} className="h-6 w-6" />
                </span>
              </div>
              <div className="p-6 sm:p-10">
              <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{data.name}</h1>
              <p className="mt-4 text-lg text-slate-600">{data.description}</p>

              <dl className="mt-8 grid gap-4 sm:grid-cols-3">
                <div className="rounded-2xl bg-brand-soft/60 p-4">
                  <dt className="flex items-center gap-2 text-sm text-slate-500">
                    <Clock className="h-4 w-4 text-brand" aria-hidden="true" /> Duration
                  </dt>
                  <dd className="mt-1 font-bold text-brand-deep">{formatDuration(data.durationMin)}</dd>
                </div>
                <div className="rounded-2xl bg-brand-soft/60 p-4">
                  <dt className="flex items-center gap-2 text-sm text-slate-500">
                    <Tag className="h-4 w-4 text-brand" aria-hidden="true" /> Typical cost
                  </dt>
                  <dd className="mt-1 font-bold text-brand-deep">{formatPriceRange(data.priceMin, data.priceMax)}</dd>
                </div>
                <div className="rounded-2xl bg-brand-soft/60 p-4">
                  <dt className="flex items-center gap-2 text-sm text-slate-500">
                    <CreditCard className="h-4 w-4 text-brand" aria-hidden="true" /> Pay online to book
                  </dt>
                  <dd className="mt-1 font-bold text-brand-deep">{formatPaise(data.bookingPrice)}</dd>
                </div>
              </dl>
              <p className="mt-4 text-sm text-slate-500">
                The online amount secures your slot. The final treatment cost is confirmed by the dentist after your examination.
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                <ButtonLink to={`/book?treatment=${data.slug}`} size="lg">
                  Book this treatment
                </ButtonLink>
                <ButtonLink to="/contact" variant="outline" size="lg">
                  Ask a question
                </ButtonLink>
              </div>
              </div>
            </article>
          )}
        </Container>
      </section>
      <BookingCta />
    </>
  );
}