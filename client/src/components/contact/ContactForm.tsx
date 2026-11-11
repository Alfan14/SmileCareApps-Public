import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { CheckCircle2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { sendContact } from "../../api/contact";
import { contactSchema } from "../../lib/validators";
import type { ContactInput } from "../../lib/validators";
import { Button } from "../ui/Button";

const inputClass =
  "mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800 focus-visible:outline-2 focus-visible:outline-brand-deep aria-[invalid=true]:border-red-500";

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} role="alert" className="mt-1 text-xs text-red-700">
      {message}
    </p>
  );
}

export function ContactForm() {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ContactInput>({ resolver: zodResolver(contactSchema) });

  const mutation = useMutation({ mutationFn: sendContact, onSuccess: () => reset() });

  const onSubmit = handleSubmit(({ phone, website, ...rest }) => {
    mutation.mutate({ ...rest, ...(phone ? { phone } : {}), ...(website ? { website } : {}) });
  });

  if (mutation.isSuccess) {
    return (
      <div role="status" className="flex flex-col items-center gap-3 rounded-2xl bg-brand-soft p-8 text-center">
        <CheckCircle2 className="h-10 w-10 text-brand-strong" aria-hidden="true" />
        <h3 className="text-xl font-bold">Thank you! Your message is on its way.</h3>
        <p className="text-sm text-slate-600">We will get back to you as soon as possible.</p>
        <Button variant="outline" onClick={() => mutation.reset()}>
          Send another message
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4" aria-label="Contact form">
      <div>
        <label htmlFor="c-name" className="text-sm font-medium text-slate-700">
          Full name *
        </label>
        <input id="c-name" autoComplete="name" className={inputClass} aria-invalid={!!errors.name} aria-describedby="c-name-err" {...register("name")} />
        <FieldError id="c-name-err" message={errors.name?.message} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="c-email" className="text-sm font-medium text-slate-700">
            Email *
          </label>
          <input id="c-email" type="email" autoComplete="email" className={inputClass} aria-invalid={!!errors.email} aria-describedby="c-email-err" {...register("email")} />
          <FieldError id="c-email-err" message={errors.email?.message} />
        </div>
        <div>
          <label htmlFor="c-phone" className="text-sm font-medium text-slate-700">
            Phone (optional)
          </label>
          <input id="c-phone" type="tel" autoComplete="tel" className={inputClass} aria-invalid={!!errors.phone} aria-describedby="c-phone-err" {...register("phone")} />
          <FieldError id="c-phone-err" message={errors.phone?.message} />
        </div>
      </div>

      <div>
        <label htmlFor="c-message" className="text-sm font-medium text-slate-700">
          How can we help? *
        </label>
        <textarea id="c-message" rows={5} className={inputClass} aria-invalid={!!errors.message} aria-describedby="c-message-err" {...register("message")} />
        <FieldError id="c-message-err" message={errors.message?.message} />
      </div>

      {/* Honeypot: hidden from people and screen readers; bots tend to fill it in. */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label htmlFor="c-website">Website</label>
        <input id="c-website" tabIndex={-1} autoComplete="off" {...register("website")} />
      </div>

      {mutation.isError && (
        <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-800">
          {mutation.error.message || "We could not send your message. Please try again."}
        </p>
      )}

      <Button type="submit" size="lg" className="w-full" disabled={mutation.isPending}>
        {mutation.isPending ? "Sending…" : "Send message"}
      </Button>
      <p className="text-center text-xs text-slate-500">Please do not share medical or personal details. This is a demo.</p>
    </form>
  );
}
