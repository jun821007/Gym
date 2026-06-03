import { cn } from "@/lib/utils";

interface CardProps {
  children: React.ReactNode;
  className?: string;
  title?: string;
  pixel?: boolean;
}

export function Card({ children, className, title, pixel }: CardProps) {
  return (
    <section className={cn(pixel ? "pixel-card" : "card", className)}>
      {title && (
        <h2
          className={cn(
            pixel
              ? "text-pixel-sm mb-3 font-bold text-accent-light"
              : "card-title",
          )}
        >
          {pixel ? `▶ ${title}` : title}
        </h2>
      )}
      {children}
    </section>
  );
}
