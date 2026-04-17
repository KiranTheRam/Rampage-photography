import type { Metadata } from "next";
import Grain from "@/components/Grain";
import Cursor from "@/components/Cursor";
import "./globals.css";

export const metadata: Metadata = {
  title: "Rampage — Photography",
  description: "A personal photographic portfolio.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full bg-black text-[#efe7dc] font-sans selection:bg-[#efe7dc] selection:text-black">
        <Grain />
        <Cursor />
        {children}
      </body>
    </html>
  );
}
