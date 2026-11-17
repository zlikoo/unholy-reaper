import type { ReactNode } from "react";

export function PageHeader({
  title,
  description,
  actions,
  back,
}: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  back?: ReactNode;
}) {
  return (
    <div className="mb-6 space-y-3">
      {back}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <h1 className="font-brand text-3xl leading-tight tracking-wide text-bone sm:text-4xl">{title}</h1>
          <div className="mt-2 h-0.5 w-16 bg-blood" />
          {description && <p className="mt-3 max-w-2xl text-sm text-ash">{description}</p>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
    </div>
  );
}
