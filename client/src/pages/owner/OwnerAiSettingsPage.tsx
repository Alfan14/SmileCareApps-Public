import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle2, KeyRound, XCircle } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { ConfirmButton } from "../../components/owner/ConfirmButton";
import { FieldError } from "../../components/auth/FieldError";
import { PasswordInput } from "../../components/auth/PasswordInput";
import { Button } from "../../components/ui/Button";
import { Skeleton } from "../../components/ui/Skeleton";
import { ErrorState } from "../../components/ui/StateMessage";
import { useAiSettings, useSaveAiSettings, useTestAiConnection } from "../../hooks/useAi";
import { inputClass } from "../../lib/formStyles";
import type { AiSettings, AiSettingsInput } from "../../types/api";

const schema = z.object({
  provider: z.enum(["mock", "gemini", "openai"]),
  model: z.string().trim().max(100, "Keep the model name under 100 characters"),
  enabled: z.boolean(),
  apiKey: z
    .string()
    .trim()
    .refine((v) => v === "" || (v.length >= 8 && v.length <= 300 && !/\s/.test(v)), "That does not look like an API key (at least 8 characters, no spaces)"),
});
type FormValues = z.infer<typeof schema>;

const PROVIDERS = [
  { value: "mock", label: "Demo mode (pre-written answers, no key needed)" },
  { value: "gemini", label: "Google Gemini" },
  { value: "openai", label: "OpenAI" },
] as const;

type EditorProps = {
  settings: AiSettings;
  onSave: (input: AiSettingsInput) => Promise<boolean>;
  saving: boolean;
  saved: boolean;
  error: string | null;
};

function Editor({ settings, onSave, saving, saved, error }: EditorProps) {
  const test = useTestAiConnection();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { provider: settings.provider, model: settings.model, enabled: settings.enabled, apiKey: "" },
  });

  const submit = handleSubmit(async (v) => {
    test.reset();
    const ok = await onSave({ provider: v.provider, model: v.model, enabled: v.enabled, ...(v.apiKey ? { apiKey: v.apiKey } : {}) });
    if (ok) reset({ provider: v.provider, model: v.model, enabled: v.enabled, apiKey: "" }); // the key is never kept in the form
  });

  return (
    <div className="space-y-6">
      <form onSubmit={submit} noValidate className="space-y-5 rounded-3xl border border-slate-100 bg-white p-5 shadow-sm sm:p-6" aria-label="AI assistant settings">
        <div>
          <label htmlFor="ai-provider" className="text-sm font-medium text-slate-700">
            Provider
          </label>
          <select id="ai-provider" className={`mt-1 ${inputClass}`} {...register("provider")}>
            {PROVIDERS.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="ai-model" className="text-sm font-medium text-slate-700">
            Model (optional)
          </label>
          <input id="ai-model" autoComplete="off" className={`mt-1 ${inputClass}`} aria-describedby="ai-model-hint ai-model-err" {...register("model")} />
          <p id="ai-model-hint" className="mt-1 text-xs text-slate-500">
            Copy the model name from your provider’s documentation. Model names change often, so it is not fixed in the code.
          </p>
          <FieldError id="ai-model-err" message={errors.model?.message} />
        </div>

        <div>
          <label htmlFor="ai-key" className="text-sm font-medium text-slate-700">
            API key
          </label>
          <div className="mt-1">
            <PasswordInput id="ai-key" autoComplete="off" spellCheck={false} aria-describedby="ai-key-status ai-key-err" {...register("apiKey")} />
          </div>
          <p id="ai-key-status" className="mt-1 flex items-center gap-1.5 text-xs text-slate-600">
            <KeyRound className="h-4 w-4 shrink-0" aria-hidden="true" />
            {settings.hasKey
              ? `A key is saved${settings.keyLast4 ? ` (ends in ${settings.keyLast4})` : ""}. Leave this empty to keep it, or paste a new key to replace it.`
              : "No key is saved. The assistant uses the server’s default key if one is set, otherwise demo answers."}
          </p>
          <FieldError id="ai-key-err" message={errors.apiKey?.message} />
          <p className="mt-1 text-xs text-slate-500">The key is sent to the server over a secure connection, stored encrypted, and never shown again.</p>
        </div>

        <label className="flex cursor-pointer items-center gap-3 text-sm text-slate-700">
          <input type="checkbox" className="h-4 w-4 accent-brand-strong focus-visible:outline-2 focus-visible:outline-brand-deep" {...register("enabled")} />
          The AI assistant is switched on for visitors
        </label>

        {error && (
          <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-800">
            {error}
          </p>
        )}
        {saved && !isDirty && (
          <p role="status" className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-900">
            Saved.
          </p>
        )}

        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit" size="lg" disabled={saving || !isDirty}>
            {saving ? "Saving…" : "Save settings"}
          </Button>
          {isDirty && <span className="text-sm text-amber-800">You have unsaved changes.</span>}
        </div>
      </form>

      <section aria-labelledby="ai-test" className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm sm:p-6">
        <h2 id="ai-test" className="text-lg font-bold">
          Test the connection
        </h2>
        <p className="mt-1 text-sm text-slate-600">Sends a short test message using the saved settings.</p>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Button variant="outline" onClick={() => test.mutate()} disabled={isDirty || test.isPending}>
            {test.isPending ? "Testing…" : "Test connection"}
          </Button>
          {settings.hasKey && (
            <ConfirmButton
              label="Remove saved key"
              confirmLabel="Yes, remove it"
              disabled={saving}
              onConfirm={() => void onSave({ provider: settings.provider, model: settings.model, enabled: settings.enabled, clearKey: true })}
            />
          )}
        </div>
        {isDirty && <p className="mt-2 text-xs text-slate-500">Save your changes first, so the test uses them.</p>}

        {test.isSuccess && (
          <p role="status" className={`mt-4 flex items-start gap-2 rounded-xl p-3 text-sm ${test.data.ok ? "bg-emerald-50 text-emerald-900" : "bg-red-50 text-red-800"}`}>
            {test.data.ok ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" /> : <XCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />}
            {test.data.message}
          </p>
        )}
        {test.isError && (
          <p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-800">
            {test.error.message}
          </p>
        )}
      </section>
    </div>
  );
}

export function OwnerAiSettingsPage() {
  const query = useAiSettings();
  const save = useSaveAiSettings();

  return (
    <>
      <header>
        <h1 className="text-3xl font-bold tracking-tight">AI assistant</h1>
        <p className="mt-1 text-slate-600">Choose how the website’s assistant answers visitors’ questions.</p>
      </header>

      {query.isPending && <Skeleton className="h-96" />}
      {query.isError && <ErrorState onRetry={() => void query.refetch()} />}
      {query.data && (
        <Editor
          key={JSON.stringify(query.data)}
          settings={query.data}
          saving={save.isPending}
          saved={save.isSuccess}
          error={save.isError ? save.error.message : null}
          onSave={async (input) => {
            try {
              await save.mutateAsync(input);
              return true;
            } catch {
              return false; // the message comes from save.error
            }
          }}
        />
      )}
    </>
  );
}
