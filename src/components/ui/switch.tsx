import * as React from "react";
import { Switch as BaseSwitch } from "@base-ui-components/react/switch";
import { cn } from "../../lib/utils";

type SwitchProps = React.ComponentProps<typeof BaseSwitch.Root>;

export function Switch({ className, ...props }: SwitchProps) {
  return (
    <BaseSwitch.Root
      className={cn(
        "relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full bg-zinc-700 p-0.5 transition-colors outline-none",
        "focus-visible:ring-2 focus-visible:ring-emerald-400/60 data-[checked]:bg-emerald-500",
        className,
      )}
      {...props}
    >
      <BaseSwitch.Thumb className="size-4 rounded-full bg-white shadow transition-transform data-[checked]:translate-x-4" />
    </BaseSwitch.Root>
  );
}

export function LabeledSwitch({
  label,
  ...props
}: SwitchProps & { label: string }) {
  return (
    <label className="flex items-center gap-2 text-sm text-zinc-300 select-none cursor-pointer">
      <Switch {...props} />
      {label}
    </label>
  );
}
