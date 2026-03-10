import type { Metadata } from "next";
import "./globals.css";
import PasswordGate from "@/components/PasswordGate";

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
    <html lang="pt-BR">
      <body className="antialiased bg-gray-50 font-sans">
        <PasswordGate>{children}</PasswordGate>
      </body>
    </html>
  );
}
