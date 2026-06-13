import * as React from "react";
import { Tooltip } from "@base-ui-components/react/tooltip";
import { cn } from "../../lib/utils";

/** A small hover card explaining a UI element. */
export function InfoTip({
  label,
  className,
  children,
}: {
  label: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Tooltip.Provider delay={200}>
      <Tooltip.Root>
        <Tooltip.Trigger
          className={cn(
            "cursor-help underline decoration-dotted decoration-zinc-600 underline-offset-2",
            className,
          )}
        >
          {label}
        </Tooltip.Trigger>
        <Tooltip.Portal>
          <Tooltip.Positioner sideOffset={6}>
            <Tooltip.Popup className="z-50 max-w-64 rounded-lg bg-zinc-800 px-3 py-2 text-xs leading-relaxed font-normal normal-case tracking-normal text-zinc-200 shadow-xl ring-1 ring-zinc-700">
              {children}
            </Tooltip.Popup>
          </Tooltip.Positioner>
        </Tooltip.Portal>
      </Tooltip.Root>
    </Tooltip.Provider>
  );
}
