import { notFound } from "next/navigation";
import Link from "next/link";
import Hero from "@/components/Hero";
import Gallery from "@/components/Gallery";
import { getVolume } from "@/lib/volumes";
import { loadPhotos } from "@/lib/photos";

export const revalidate = 0;

type Props = { params: Promise<{ volume: string }> };

export default async function VolumePage({ params }: Props) {
  const { volume: slug } = await params;
  const [volume, { photos }] = await Promise.all([
    getVolume(slug),
    loadPhotos(slug),
  ]);

  if (!volume) notFound();

  return (
    <main className="relative">
      <nav className="fixed left-0 right-0 top-0 z-30 flex items-center justify-between gap-4 bg-gradient-to-b from-black/80 to-transparent px-5 pb-6 pt-4 text-[10px] uppercase tracking-[0.28em] text-[#efe7dc]/80 backdrop-blur-[2px] sm:px-10 sm:py-5 sm:text-[11px] sm:tracking-[0.3em]">
        <Link href="/" data-cursor="hover" className="font-display text-base normal-case tracking-normal">
          Rampage
        </Link>
        <div className="flex items-center gap-5 sm:gap-6">
          <Link href="/" data-cursor="hover" className="hover:text-[#efe7dc]">
            ← Volumes
          </Link>
          <a href="#gallery" data-cursor="hover" className="hover:text-[#efe7dc]">
            Work
          </a>
        </div>
      </nav>

      <Hero volume={volume} count={photos.length} />

      {photos.length === 0 ? (
        <section className="px-6 py-32 text-center text-sm text-[#efe7dc]/60">
          No photos yet — upload some from the{" "}
          <Link href="/admin" className="underline hover:text-[#efe7dc]">
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
