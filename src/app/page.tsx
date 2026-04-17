import Hero from "@/components/Hero";
import Gallery from "@/components/Gallery";
import { loadManifest } from "@/lib/photos";
import Link from "next/link";

export const revalidate = 0;

export default async function Home() {
  const { photos } = await loadManifest();

  return (
    <main className="relative">
      <nav className="fixed left-0 right-0 top-0 z-30 flex items-center justify-between gap-4 bg-gradient-to-b from-black/80 to-transparent px-5 pb-6 pt-4 text-[10px] uppercase tracking-[0.28em] text-[#efe7dc]/80 backdrop-blur-[2px] sm:px-10 sm:py-5 sm:text-[11px] sm:tracking-[0.3em]">
        <Link href="/" className="font-display text-base normal-case tracking-normal">
          Rampage
        </Link>
        <div className="flex items-center gap-5 sm:gap-6">
          <a href="#gallery" data-cursor="hover" className="hover:text-[#efe7dc]">
            Work
          </a>
          <Link href="/admin" data-cursor="hover" className="hover:text-[#efe7dc]">
            Admin
          </Link>
        </div>
      </nav>

      <Hero count={photos.length} />

      {photos.length === 0 ? (
        <section className="px-6 py-32 text-center text-sm text-[#efe7dc]/60">
          No photos yet — upload some from the{" "}
          <Link href="/admin" className="underline">
            admin page
          </Link>
          .
        </section>
      ) : (
        <Gallery photos={photos} />
      )}

      <footer className="relative z-10 border-t border-[#efe7dc]/10 px-6 py-12 text-[11px] uppercase tracking-[0.3em] text-[#efe7dc]/50 sm:px-10">
        <div className="flex items-center justify-between">
          <span>© {new Date().getFullYear()} Rampage</span>
          <span>Made with light.</span>
        </div>
      </footer>
    </main>
  );
}
