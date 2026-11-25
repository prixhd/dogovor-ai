import type { ComponentProps, ReactNode } from "react";
import { useId } from "react";
import { cn } from "@/lib/cn";

const control =
  "w-full rounded-xl border border-line bg-surface px-4 text-[15px] text-text placeholder:text-text-2/70 transition-colors hover:border-text-2/40 focus:border-ai focus:outline-none focus:ring-4 focus:ring-ai/15 aria-invalid:border-danger aria-invalid:focus:ring-danger/15";

type FieldShellProps = { label?: string; hint?: string; error?: string; children: (id: string, describedBy?: string) => ReactNode; className?: string; required?: boolean };

export function FieldShell({ label, hint, error, children, className, required }: FieldShellProps) {
  const id = useId();
  const descId = hint || error ? `${id}-desc` : undefined;
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      {label && (
        <label htmlFor={id} className="text-sm font-medium text-text">
          {label}
          {required && <span className="text-accent"> *</span>}
        </label>
      )}
      {children(id, descId)}
      {(error || hint) && (
        <p id={descId} className={cn("text-[13px]", error ? "text-danger" : "text-text-2")}>
          {error || hint}
        </p>
      )}
    </div>
  );
}

type InputProps = ComponentProps<"input"> & { label?: string; hint?: string; error?: string };

export function Input({ label, hint, error, className, required, ...rest }: InputProps) {
  return (
    <FieldShell label={label} hint={hint} error={error} className={className} required={required}>
      {(id, describedBy) => (
        <input id={id} aria-describedby={describedBy} aria-invalid={!!error || undefined} required={required} className={cn(control, "h-12")} {...rest} />
      )}
    </FieldShell>
  );
}

type TextareaProps = ComponentProps<"textarea"> & { label?: string; hint?: string; error?: string };

export function Textarea({ label, hint, error, className, required, ...rest }: TextareaProps) {
  return (
    <FieldShell label={label} hint={hint} error={error} className={className} required={required}>
      {(id, describedBy) => (
        <textarea id={id} aria-describedby={describedBy} aria-invalid={!!error || undefined} required={required} className={cn(control, "min-h-28 py-3 leading-relaxed")} {...rest} />
      )}
    </FieldShell>
  );
}

type SelectProps = ComponentProps<"select"> & { label?: string; hint?: string; error?: string; options: { value: string; label: string }[] };

export function Select({ label, hint, error, className, options, required, ...rest }: SelectProps) {
  return (
    <FieldShell label={label} hint={hint} error={error} className={className} required={required}>
      {(id, describedBy) => (
        <select id={id} aria-describedby={describedBy} aria-invalid={!!error || undefined} required={required} className={cn(control, "h-12 appearance-none bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2212%22 height=%228%22 fill=%22none%22><path d=%22M1 1.5l5 5 5-5%22 stroke=%22%236B6F78%22 stroke-width=%221.6%22/></svg>')] bg-[right_16px_center] bg-no-repeat pr-10")} {...rest}>
          {options.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      )}
    </FieldShell>
  );
}

type ToggleProps = { checked: boolean; onChange: (v: boolean) => void; label: string; hint?: string };

export function Toggle({ checked, onChange, label, hint }: ToggleProps) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-line bg-surface p-4 transition-colors hover:border-text-2/40">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cn("relative mt-0.5 h-6 w-10 shrink-0 rounded-full transition-colors", checked ? "bg-accent" : "bg-line")}
      >
        <span className={cn("absolute top-0.5 size-5 rounded-full bg-white shadow transition-transform", checked ? "translate-x-[18px]" : "translate-x-0.5")} />
      </button>
      <span className="flex flex-col">
        <span className="text-[15px] font-medium">{label}</span>
        {hint && <span className="text-[13px] text-text-2">{hint}</span>}
      </span>
    </label>
  );
}

export function Checkbox({ className, ...rest }: ComponentProps<"input">) {
  return (
    <input
      type="checkbox"
      className={cn("size-[18px] cursor-pointer appearance-none rounded-[5px] border-[1.5px] border-text-2/50 bg-surface transition-colors checked:border-text checked:bg-text checked:bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 16 16%22 fill=%22none%22><path d=%22M4 8.5l2.5 2.5L12 5.5%22 stroke=%22white%22 stroke-width=%222%22 stroke-linecap=%22round%22/></svg>')] bg-center", className)}
      {...rest}
    />
  );
}
