import { Metadata } from "next"
import "./globals.css"

export const metadata: Metadata = {
  title: "Student Networking CRM",
  description: "AI-powered student networking CRM",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-background font-sans antialiased">
        {children}
      </body>
    </html>
  )
}
