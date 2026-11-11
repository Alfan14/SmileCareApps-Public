import type { AnchorHTMLAttributes, ButtonHTMLAttributes } from "react";
import { Link } from "react-router-dom";
import type { LinkProps } from "react-router-dom";
import { buttonStyles } from "./buttonStyles";
import type { ButtonSize, ButtonVariant } from "./buttonStyles";

type Look = { variant?: ButtonVariant; size?: ButtonSize };

export function Button({ variant, size, className, type = "button", ...rest }: Look & ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button type={type} className={buttonStyles(variant, size, className)} {...rest} />;
}

/** Internal navigation (React Router). */
export function ButtonLink({ variant, size, className, ...rest }: Look & Omit<LinkProps, "className"> & { className?: string }) {
  return <Link className={buttonStyles(variant, size, className)} {...rest} />;
}

/** External links (WhatsApp, tel:, mailto:). */
export function ButtonAnchor({ variant, size, className, ...rest }: Look & AnchorHTMLAttributes<HTMLAnchorElement>) {
  return <a className={buttonStyles(variant, size, className)} {...rest} />;
}
