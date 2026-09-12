import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Evolvia Admin Dashboard",
  description: "Dynamic Content & Event Management Dashboard for Evolvia",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-[#090a0f] text-slate-100 antialiased font-sans">
        {children}
      </body>
    </html>
  );
}
