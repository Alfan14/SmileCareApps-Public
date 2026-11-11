import { zodResolver } from "@hookform/resolvers/zod";
import { UserPlus } from "lucide-react";
import { useForm } from "react-hook-form";
import { Link } from "react-router-dom";
import type { ApiError } from "../../api/client";
import { AuthShell } from "../../components/auth/AuthShell";
import { FieldError } from "../../components/auth/FieldError";
import { PasswordInput } from "../../components/auth/PasswordInput";
import { Button } from "../../components/ui/Button";
import { useRegister } from "../../hooks/useAuth";
import { inputClass } from "../../lib/formStyles";
import { registerSchema } from "../../lib/validators";
import type { RegisterInput } from "../../lib/validators";

export function RegisterPage() {
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<RegisterInput>({ resolver: zodResolver(registerSchema) });
  const signUp = useRegister();

  // After a successful sign-up GuestRoute redirects the new patient to their dashboard.
  const onSubmit = handleSubmit((values) => {
    const { name, email, phone, password } = values; // confirmPassword is a client-only check
    signUp.mutate(
      { name, email, password, ...(phone ? { phone } : {}) },
      {
        onError: (err) => {
          if ((err as ApiError).code === "EMAIL_TAKEN") setError("email", { message: err.message });
        },
      },
    );
  });

  return (
    <AuthShell
      icon={<UserPlus className="h-6 w-6" aria-hidden="true" />}
      title="Create your account"
      subtitle="Book visits, pay online and see your records in one place."
      footer={
        <>
          Already have an account?{" "}
          <Link to="/login" className="font-semibold text-brand-deep underline">
            Log in
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} noValidate className="space-y-4" aria-label="Create account">
        <div>
          <label htmlFor="r-name" className="text-sm font-medium text-slate-700">
            Full name *
          </label>
          <input id="r-name" autoComplete="name" className={`mt-1 ${inputClass}`} aria-invalid={!!errors.name} aria-describedby="r-name-err" {...register("name")} />
          <FieldError id="r-name-err" message={errors.name?.message} />
        </div>

        <div>
          <label htmlFor="r-email" className="text-sm font-medium text-slate-700">
            Email *
          </label>
          <input id="r-email" type="email" autoComplete="email" className={`mt-1 ${inputClass}`} aria-invalid={!!errors.email} aria-describedby="r-email-err" {...register("email")} />
          <FieldError id="r-email-err" message={errors.email?.message} />
        </div>

        <div>
          <label htmlFor="r-phone" className="text-sm font-medium text-slate-700">
            Phone (optional)
          </label>
          <input id="r-phone" type="tel" autoComplete="tel" className={`mt-1 ${inputClass}`} aria-invalid={!!errors.phone} aria-describedby="r-phone-err" {...register("phone")} />
          <FieldError id="r-phone-err" message={errors.phone?.message} />
        </div>

        <div>
          <label htmlFor="r-password" className="text-sm font-medium text-slate-700">
            Password *
          </label>
          <div className="mt-1">
            <PasswordInput id="r-password" autoComplete="new-password" aria-invalid={!!errors.password} aria-describedby="r-password-hint r-password-err" {...register("password")} />
          </div>
          <p id="r-password-hint" className="mt-1 text-xs text-slate-500">
            At least 8 characters, with a letter and a number.
          </p>
          <FieldError id="r-password-err" message={errors.password?.message} />
        </div>

        <div>
          <label htmlFor="r-confirm" className="text-sm font-medium text-slate-700">
            Repeat password *
          </label>
          <div className="mt-1">
            <PasswordInput id="r-confirm" autoComplete="new-password" aria-invalid={!!errors.confirmPassword} aria-describedby="r-confirm-err" {...register("confirmPassword")} />
          </div>
          <FieldError id="r-confirm-err" message={errors.confirmPassword?.message} />
        </div>

        {signUp.isError && !errors.email && (
          <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-800">
            {signUp.error.message}
          </p>
        )}

        <Button type="submit" size="lg" className="w-full" disabled={signUp.isPending}>
          {signUp.isPending ? "Creating account…" : "Create account"}
        </Button>
        <p className="text-center text-xs text-slate-500">This is a demo. Please do not enter real personal or medical details.</p>
      </form>
    </AuthShell>
  );
}
