import { cn } from "@/lib/utils"

interface PageWrapperProps {
  children: React.ReactNode
  className?: string
}

export function PageWrapper({ children, className }: PageWrapperProps) {
  return (
    <main className={cn("flex flex-1 flex-col gap-6 p-6", className)}>
      {children}
    </main>
  )
}
