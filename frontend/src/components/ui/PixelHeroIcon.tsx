import { cn } from "@/lib/utils";

interface PixelHeroIconProps {
  className?: string;
}

/** 16×16 像素勇者（正面上身 + 劍） */
export function PixelHeroIcon({ className }: PixelHeroIconProps) {
  return (
    <svg
      viewBox="0 0 16 16"
      className={cn("mx-auto h-4 w-4 shrink-0", className)}
      shapeRendering="crispEdges"
      aria-hidden
    >
      <rect x="5" y="1" width="6" height="2" fill="#f4c542" />
      <rect x="4" y="3" width="8" height="2" fill="#f4c542" />
      <rect x="5" y="5" width="6" height="3" fill="#f5c99a" />
      <rect x="6" y="6" width="1" height="1" fill="#1a1a2e" />
      <rect x="9" y="6" width="1" height="1" fill="#1a1a2e" />
      <rect x="4" y="8" width="8" height="4" fill="#38b764" />
      <rect x="5" y="9" width="6" height="1" fill="#6ee7a0" />
      <rect x="5" y="12" width="2" height="3" fill="#262b44" />
      <rect x="9" y="12" width="2" height="3" fill="#262b44" />
      <rect x="12" y="4" width="1" height="8" fill="#c0c8d0" />
      <rect x="11" y="11" width="3" height="1" fill="#f4c542" />
    </svg>
  );
}
