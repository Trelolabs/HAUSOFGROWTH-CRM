import type { Metadata } from "next"
import { Inter } from "next/font/google"
import { Toaster } from "react-hot-toast"
import { ConditionalLayout } from "@/components/layout/ConditionalLayout"
import "./globals.css"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "HOG Agency CRM",
  description: "Marketing agency CRM — leads, campaigns, templates",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className={inter.className}>
        <ConditionalLayout>{children}</ConditionalLayout>
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: "hsl(222.2 47.4% 7.2%)",
              color: "hsl(210 40% 98%)",
              border: "1px solid hsl(217.2 32.6% 17.5%)",
            },
          }}
        />
      </body>
    </html>
  )
}
