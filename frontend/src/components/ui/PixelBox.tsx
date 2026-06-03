import { cn } from "@/lib/utils";

interface PixelBoxProps {
  children: React.ReactNode;
  className?: string;
  variant?: "default" | "gold";
  title?: string;
}

export function PixelBox({
  children,
  className,
  variant = "default",
  title,
}: PixelBoxProps) {
  return (
    <section
      className={cn(
        "pixel-box p-4",
        variant === "gold" && "pixel-box--gold",
        className,
      )}
    >
      {title && (
        <h2 className="mb-3 text-[10px] leading-relaxed text-accent-gold">
          ▶ {title}
        </h2>
      )}
      {children}
    </section>
  );
}
