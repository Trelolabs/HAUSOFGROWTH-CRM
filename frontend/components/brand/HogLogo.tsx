import { cn } from "@/lib/utils"

interface HogLogoProps {
  /** Extra classes for the disc (size, hover, etc.). Default size: h-10 w-10 */
  className?: string
  /** Extra classes for the "HOG" text (e.g. font size). Default: text-xs */
  textClassName?: string
}

/**
 * HOG brand mark — a flat dark disc with the "HOG" wordmark.
 * Shared across the Sidebar, Login page and the generated favicon
 * (see app/icon.tsx) so the logo stays consistent everywhere.
 */
export function HogLogo({ className, textClassName }: HogLogoProps) {
  return (
    <div className={cn("hog-logo h-10 w-10", className)}>
      <span
        className={cn(
          "font-display text-xs font-bold uppercase tracking-widest text-[#F8F4EF] select-none",
          textClassName
        )}
      >
        HOG
      </span>
    </div>
  )
}
