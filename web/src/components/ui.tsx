import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cx } from "../lib/cx";

export function Button({ className, ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      {...props}
      className={cx(
        "inline-flex items-center justify-center gap-2 rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-strong",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:cursor-not-allowed disabled:opacity-60",
        className,
      )}
    />
  );
}

export function Alert({ children }: { children: ReactNode }) {
  return (
    <p role="alert" className="rounded-xl bg-danger-soft px-3.5 py-2 text-sm text-danger">
      {children}
    </p>
  );
}

/** Navy tile with an amber spark, Glide-style. Marks the app and each answer. */
export function Mark({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" className="flex-none">
      <rect width="24" height="24" rx="7.5" className="fill-brand" />
      <path
        d="M4.8 14.2h3l1.1 1.9h3l1.1-1.9h2.6M4.8 14.2l1.5-4.6h6.4M4.8 14.2v3.6h11.8v-3.6"
        fill="none"
        stroke="white"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M17.6 3.4 18.5 5.6a.9.9 0 0 0 .5.5l2.2.9-2.2.9a.9.9 0 0 0-.5.5l-.9 2.2-.9-2.2a.9.9 0 0 0-.5-.5L14 7l2.2-.9a.9.9 0 0 0 .5-.5l.9-2.2Z"
        className="fill-accent"
      />
    </svg>
  );
}
