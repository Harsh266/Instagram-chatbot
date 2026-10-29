import type { Metadata } from "next";
import { Geist_Mono, Manrope, Montserrat } from "next/font/google";
import { AppShell } from "@/components/shell/AppShell";
import "./globals.css";

const manrope = Manrope({ variable: "--font-manrope", subsets: ["latin"] });
const montserrat = Montserrat({ variable: "--font-montserrat", subsets: ["latin"], weight: ["500", "600", "700"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Instagram AI Chatbot Demo",
  description:
    "Interactive demo of an Instagram AI chatbot and lead automation workflow. All data is sample data simulated locally in the browser.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${manrope.variable} ${montserrat.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full font-sans">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
