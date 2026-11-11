import { zodResolver } from "@hookform/resolvers/zod";
import { LogIn } from "lucide-react";
import { useForm } from "react-hook-form";
import { Link } from "react-router-dom";
import { FieldError } from "../../components/auth/FieldError";
import { AuthShell } from "../../components/auth/AuthShell";
import { PasswordInput } from "../../components/auth/PasswordInput";
import { Button } from "../../components/ui/Button";
import { useLogin } from "../../hooks/useAuth";
import { inputClass } from "../../lib/formStyles";
import { loginSchema } from "../../lib/validators";
import type { LoginInput } from "../../lib/validators";


export function LoginPage() {
  const SHOW_DEMO = import.meta.env.VITE_SHOW_DEMO_LOGINS !== "false";

  const demoAccounts = [
    { 
      label: "Patient demo", 
      email: "patient@smilecare.test",  
      password: "Patient@12345"
    },
    { 
      label: "Owner demo", 
      email: "owner@smilecare.test",  
      password: "Owner@12345"
    },
  ];

  const {
    register,
    handleSubmit,
    setValue,                 
    formState: { errors },
  } = useForm<LoginInput>({ resolver: zodResolver(loginSchema) });
  const login = useLogin();

  // After a successful login GuestRoute redirects to the page the visitor wanted, or to their dashboard.
  const onSubmit = handleSubmit((values) => login.mutate(values));

  return (
    <AuthShell
      icon={<LogIn className="h-6 w-6" aria-hidden="true" />}
      title="Welcome back"
      subtitle="Log in to manage your appointments and records."
      footer={
        <>
          New to SmileCare?{" "}
          <Link to="/register" className="font-semibold text-brand-deep underline">
            Create an account
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} noValidate className="space-y-4" aria-label="Log in">
        <div>
          <label htmlFor="l-email" className="text-sm font-medium text-slate-700">
            Email
          </label>
          <input id="l-email" type="email" autoComplete="email" className={`mt-1 ${inputClass}`} aria-invalid={!!errors.email} aria-describedby="l-email-err" {...register("email")} />
          <FieldError id="l-email-err" message={errors.email?.message} />
        </div>

        <div>
          <label htmlFor="l-password" className="text-sm font-medium text-slate-700">
            Password
          </label>
          <div className="mt-1">
            <PasswordInput id="l-password" autoComplete="current-password" aria-invalid={!!errors.password} aria-describedby="l-password-err" {...register("password")} />
          </div>
          <FieldError id="l-password-err" message={errors.password?.message} />
        </div>

        {login.isError && (
          <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-800">
            {login.error.message}
          </p>
        )}

        <Button type="submit" size="lg" className="w-full" disabled={login.isPending}>
          {login.isPending ? "Logging in…" : "Log in"}
        </Button>

        {SHOW_DEMO && (
        <div className="mt-6 space-y-2 text-center">
          <p className="text-xs text-slate-500">Quick demo logins</p>
          <div className="flex flex-wrap justify-center gap-2">
            {demoAccounts.map((acc) => (
              <button
                key={acc.label}
                type="button"
                className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
                onClick={() => {
                  setValue("email", acc.email, { shouldValidate: true });
                  setValue("password", acc.password, { shouldValidate: true });
                }}
              >
                {acc.label}
              </button>
            ))}
          </div>
        </div>
        )}
      </form>
    </AuthShell>
  );
}
