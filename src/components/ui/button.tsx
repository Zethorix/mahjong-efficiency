import * as React from "react";
import { cn } from "../../lib/utils";

const variants = {
  default:
    "bg-emerald-500 text-emerald-950 hover:bg-emerald-400 shadow-sm shadow-emerald-950/50",
  secondary: "bg-zinc-800 text-zinc-100 hover:bg-zinc-700 ring-1 ring-zinc-700",
  ghost: "text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100",
} as const;

const sizes = {
  default: "h-9 px-4 text-sm",
  sm: "h-7 px-2.5 text-xs",
} as const;

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: keyof typeof variants;
  size?: keyof typeof sizes;
}

export function Button({
  className,
  variant = "default",
  size = "default",
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-1.5 rounded-md font-medium transition-colors cursor-pointer disabled:pointer-events-none disabled:opacity-50",
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    />
  );
}
