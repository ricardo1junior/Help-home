import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Header } from "@/components/header";
import "./globals.css";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });

export const metadata: Metadata = {
  title: { default: "Help Home", template: "%s · Help Home" },
  description: "Encontre encanador, eletricista, marceneiro e outros profissionais para pequenos reparos na sua casa.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR" className={`${inter.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col font-sans">
        <Header />
        <main className="flex-1">{children}</main>
        <footer className="border-t border-slate-200 py-6 text-center text-xs text-slate-500">
          © {new Date().getFullYear()} Help Home
        </footer>
      </body>
    </html>
  );
}
