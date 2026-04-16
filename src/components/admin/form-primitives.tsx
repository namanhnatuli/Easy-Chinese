import type { ReactNode } from "react";

export function AdminFormCard({
  children,
  title,
  description,
}: {
  children: ReactNode;
  title: string;
  description?: string;
}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-slate-950">{title}</h2>
        {description ? <p className="mt-2 text-sm text-slate-600">{description}</p> : null}
      </div>
      {children}
    </div>
  );
}

export function Field({
  label,
  htmlFor,
  hint,
  children,
}: {
  label: string;
  htmlFor?: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="space-y-2" htmlFor={htmlFor}>
      <span className="text-sm font-medium text-slate-700">{label}</span>
      {children}
      {hint ? <span className="block text-xs text-slate-500">{hint}</span> : null}
    </label>
  );
}

export function inputClassName() {
  return "w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-slate-400";
}

export function textareaClassName() {
  return `${inputClassName()} min-h-32`;
}

export function checkboxClassName() {
  return "h-4 w-4 rounded border-slate-300";
}

export function AdminSubmitRow({
  submitLabel,
  secondaryAction,
}: {
  submitLabel: string;
  secondaryAction?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap gap-3 pt-2">
      <button
        type="submit"
        className="rounded-full bg-slate-900 px-5 py-2 text-sm font-semibold text-white"
      >
        {submitLabel}
      </button>
      {secondaryAction}
    </div>
  );
}
