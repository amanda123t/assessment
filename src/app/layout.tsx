import type { Metadata } from "next";
import { Inter } from 'next/font/google';
import "./globals.css";
import PasswordGate from "@/components/PasswordGate";

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-sans',
});

export const metadata: Metadata = {
  title: "Operational Efficiency Assessment",
  description: "Identify subprocesses with the highest potential for operational efficiency improvements",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className={inter.variable} suppressHydrationWarning>
      <body className="antialiased font-sans">
        <PasswordGate>{children}</PasswordGate>
      </body>
    </html>
  );
}
