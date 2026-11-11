import { cn } from "../../lib/cn";

export type ButtonVariant = "primary" | "outline" | "ghost" | "light";
export type ButtonSize = "md" | "lg";

const base =
  "inline-flex items-center justify-center gap-2 rounded-full font-semibold transition-colors " +
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-deep " +
  "disabled:cursor-not-allowed disabled:opacity-60";

const variants: Record<ButtonVariant, string> = {
  primary: "bg-brand-strong text-white hover:bg-brand-deep",
  outline: "border border-brand-strong text-brand-deep hover:bg-brand-soft",
  ghost: "text-brand-deep hover:bg-brand-soft",
  light: "bg-white text-brand-deep hover:bg-brand-soft",
};

const sizes: Record<ButtonSize, string> = {
  md: "px-5 py-2.5 text-sm",
  lg: "px-7 py-3.5 text-base",
};

export const buttonStyles = (variant: ButtonVariant = "primary", size: ButtonSize = "md", className?: string) =>
  cn(base, variants[variant], sizes[size], className);
