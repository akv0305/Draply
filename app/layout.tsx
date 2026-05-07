import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: "Draply",
  description: "Fashion delivered in 30 minutes.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} antialiased min-h-screen bg-background`}>
        <div className="min-h-screen flex items-center justify-center p-4">
          {children}
        </div>
        <Toaster richColors position="top-center" />
      </body>
    </html>
  );
}
