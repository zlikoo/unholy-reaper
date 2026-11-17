"use client";

import Form from "next/form";
import type { ReactNode } from "react";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { inputBaseClasses, inputClasses } from "./styles";

/**
 * GET-Formular für Suche und Filter. Auswahlfelder senden bei Änderung sofort ab,
 * das Suchfeld mit Enter oder über den Button.
 */
export function FilterForm({ action, children, className }: { action: string; children: ReactNode; className?: string }) {
  return (
    <Form
      action={action}
      className={cn("flex flex-wrap items-end gap-2", className)}
      onChange={(event) => {
        if (event.target instanceof HTMLSelectElement) event.currentTarget.requestSubmit();
      }}
    >
      {children}
    </Form>
  );
}

export function SearchInput({ defaultValue, placeholder = "Suchen …" }: { defaultValue?: string; placeholder?: string }) {
  return (
    <div className="relative min-w-48 flex-1">
      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ash" aria-hidden />
      <input
        type="search"
        name="q"
        defaultValue={defaultValue}
        placeholder={placeholder}
        aria-label="Suche"
        className={cn(inputClasses, "h-10 pl-9")}
      />
    </div>
  );
}

export function FilterSelect({
  name,
  label,
  defaultValue,
  options,
}: {
  name: string;
  label: string;
  defaultValue?: string;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <select name={name} defaultValue={defaultValue ?? ""} aria-label={label} className={cn(inputBaseClasses, "h-10 w-full min-w-36 pr-8 sm:w-auto")}>
      <option value="">{label}: alle</option>
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}
