import type { Metadata } from "next"
import { DM_Sans, Fraunces } from "next/font/google"
import { Toaster } from "react-hot-toast"
import { ConditionalLayout } from "@/components/layout/ConditionalLayout"
import "./globals.css"

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
})

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  weight: ["300", "400", "500", "600", "700", "900"],
})

export const metadata: Metadata = {
  title: "HOG Agency CRM",
  description: "Marketing agency CRM — leads, campaigns, templates",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`dark ${dmSans.variable} ${fraunces.variable}`}>
      <body className={dmSans.className}>
        <ConditionalLayout>{children}</ConditionalLayout>
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: "hsl(0 17% 12%)",
              color: "hsl(33 39% 95%)",
              border: "1px solid hsl(0 23% 18%)",
              fontSize: "13px",
              fontWeight: 500,
            },
          }}
        />
      </body>
    </html>
  )
}
