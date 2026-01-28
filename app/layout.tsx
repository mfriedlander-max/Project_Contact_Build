import { Metadata } from "next"

export const metadata: Metadata = {
  title: "Student Networking CRM - API",
  description: "Backend API for Student Networking CRM",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
