"use client";

import {
  createContext,
  startTransition,
  use,
  useActionState,
  useEffect,
  useRef,
  type ComponentProps,
  type FormEvent,
  type ReactNode,
} from "react";
import { initialActionState, type ActionState } from "@/lib/action-state";
import { cn } from "@/lib/utils";
import { buttonClasses, type ButtonSize, type ButtonVariant } from "./button";
import { Alert } from "./misc";
import { inputClasses } from "./styles";

type FormAction = (state: ActionState, formData: FormData) => Promise<ActionState>;

const FormContext = createContext<{ state: ActionState; pending: boolean }>({
  state: initialActionState,
  pending: false,
});

function useFormContext() {
  return use(FormContext);
}

/**
 * Formular für Server Actions. Fehlermeldungen pro Feld kommen aus dem Rückgabewert.
 * Die Eingaben bleiben bei Fehlern erhalten (kein automatisches Zurücksetzen).
 */
export function ActionForm({
  action,
  children,
  className,
  resetOnSuccess = false,
  confirmMessage,
}: {
  action: FormAction;
  children: ReactNode;
  className?: string;
  resetOnSuccess?: boolean;
  confirmMessage?: string;
}) {
  const [state, dispatch, pending] = useActionState(action, initialActionState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (resetOnSuccess && state.status === "success") formRef.current?.reset();
  }, [resetOnSuccess, state.status, state.at]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (confirmMessage && !window.confirm(confirmMessage)) return;
    const formData = new FormData(event.currentTarget);
    startTransition(() => dispatch(formData));
  }

  return (
    <FormContext value={{ state, pending }}>
      <form ref={formRef} onSubmit={handleSubmit} className={className}>
        {state.message && state.status !== "idle" && (
          <div className="mb-4">
            <Alert tone={state.status === "error" ? "error" : "success"}>{state.message}</Alert>
          </div>
        )}
        {children}
      </form>
    </FormContext>
  );
}

export function Field({
  name,
  label,
  hint,
  children,
  className,
}: {
  name: string;
  label: string;
  hint?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  const { state } = useFormContext();
  const errors = state.fieldErrors?.[name];
  return (
    <div className={cn("space-y-1.5", className)}>
      <label htmlFor={name} className="block font-display text-xs uppercase tracking-wider text-ash">
        {label}
      </label>
      {children}
      {hint && !errors && <p className="text-xs text-ash/80">{hint}</p>}
      {errors?.map((error) => (
        <p key={error} className="text-xs text-red-300">
          {error}
        </p>
      ))}
    </div>
  );
}

function useInvalid(name?: string) {
  const { state } = useFormContext();
  return name && state.fieldErrors?.[name] ? true : undefined;
}

export function Input({ className, name, id, ...props }: ComponentProps<"input"> & { name: string }) {
  const invalid = useInvalid(name);
  return <input id={id ?? name} name={name} aria-invalid={invalid} className={cn(inputClasses, "h-10", className)} {...props} />;
}

export function Textarea({ className, name, id, rows = 3, ...props }: ComponentProps<"textarea"> & { name: string }) {
  const invalid = useInvalid(name);
  return (
    <textarea
      id={id ?? name}
      name={name}
      rows={rows}
      aria-invalid={invalid}
      className={cn(inputClasses, "py-2", className)}
      {...props}
    />
  );
}

export function Select({ className, name, id, ...props }: ComponentProps<"select"> & { name: string }) {
  const invalid = useInvalid(name);
  return <select id={id ?? name} name={name} aria-invalid={invalid} className={cn(inputClasses, "h-10 pr-8", className)} {...props} />;
}

export function Checkbox({
  name,
  label,
  description,
  value,
  defaultChecked,
  disabled,
}: {
  name: string;
  label: ReactNode;
  description?: ReactNode;
  value?: string;
  defaultChecked?: boolean;
  disabled?: boolean;
}) {
  const id = value ? `${name}-${value}` : name;
  return (
    <label htmlFor={id} className={cn("flex items-start gap-3", disabled ? "opacity-70" : "cursor-pointer")}>
      <input
        id={id}
        type="checkbox"
        name={name}
        value={value}
        defaultChecked={defaultChecked}
        disabled={disabled}
        className="mt-0.5 size-4 shrink-0 rounded border-line bg-ink accent-blood"
      />
      <span className="text-sm">
        <span className="text-bone">{label}</span>
        {description && <span className="block text-xs text-ash">{description}</span>}
      </span>
    </label>
  );
}

export function SubmitButton({
  children,
  pendingText = "Speichert …",
  variant = "primary",
  size = "md",
  className,
}: {
  children: ReactNode;
  pendingText?: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
}) {
  const { pending } = useFormContext();
  return (
    <button type="submit" disabled={pending} className={buttonClasses(variant, size, className)}>
      {pending ? pendingText : children}
    </button>
  );
}

/**
 * Einzelner Button, der eine Server Action auslöst (z. B. Löschen, Freigeben).
 * Optional mit Sicherheitsabfrage. Fehler werden direkt unter dem Button angezeigt.
 */
export function ActionButton({
  action,
  children,
  confirmMessage,
  variant = "secondary",
  size = "sm",
  className,
  title,
}: {
  action: FormAction;
  children: ReactNode;
  confirmMessage?: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
  title?: string;
}) {
  const [state, dispatch, pending] = useActionState(action, initialActionState);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (confirmMessage && !window.confirm(confirmMessage)) return;
    const formData = new FormData(event.currentTarget);
    startTransition(() => dispatch(formData));
  }

  return (
    <form onSubmit={handleSubmit} className="inline-flex flex-col items-start gap-1">
      <button type="submit" disabled={pending} title={title} className={buttonClasses(variant, size, className)}>
        {children}
      </button>
      {state.status === "error" && state.message && <span className="max-w-60 text-xs text-red-300">{state.message}</span>}
    </form>
  );
}
