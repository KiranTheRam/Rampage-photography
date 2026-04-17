import Link from "next/link";
import type { Metadata } from "next";
import { isAuthed } from "@/lib/auth";
import { loadPhotos } from "@/lib/photos";
import LoginForm from "./LoginForm";
import AdminClient from "./AdminClient";

export const revalidate = 0;
export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
};

export default async function AdminPage() {
  const authed = await isAuthed();
  const { photos } = authed ? await loadPhotos() : { photos: [] };

  return (
    <main className="relative min-h-screen">
      <nav className="fixed left-0 right-0 top-0 z-30 flex items-center justify-between gap-4 bg-gradient-to-b from-black/80 to-transparent px-5 pb-6 pt-4 text-[10px] uppercase tracking-[0.28em] text-[#efe7dc]/80 backdrop-blur-[2px] sm:px-10 sm:py-5 sm:text-[11px] sm:tracking-[0.3em]">
        <Link
          href="/"
          data-cursor="hover"
          className="font-display text-base normal-case tracking-normal"
        >
          Rampage
        </Link>
        <Link href="/" data-cursor="hover" className="hover:text-[#efe7dc]">
          ← Back to site
        </Link>
      </nav>

      {authed ? <AdminClient initialPhotos={photos} /> : <LoginForm />}
    </main>
  );
}
