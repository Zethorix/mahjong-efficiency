import { kindLabel, tileImage } from "../lib/tiles";
import { cn } from "../lib/utils";

const sizes = {
  lg: "w-12 sm:w-14",
  md: "w-9",
  sm: "w-7",
  xs: "w-5",
} as const;

export interface TileImgProps {
  kind: number;
  red?: boolean;
  size?: keyof typeof sizes;
  className?: string;
}

export function TileImg({ kind, red = false, size = "md", className }: TileImgProps) {
  return (
    <img
      src={`${import.meta.env.BASE_URL}tiles/${tileImage(kind, red)}.svg`}
      alt={(red ? "red " : "") + kindLabel(kind)}
      draggable={false}
      className={cn("select-none drop-shadow-sm", sizes[size], className)}
    />
  );
}
