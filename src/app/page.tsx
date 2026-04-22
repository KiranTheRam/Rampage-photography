import Link from "next/link";
import { loadVolumes } from "@/lib/volumes";
import { loadPhotos } from "@/lib/photos";
import VolumeCard from "@/components/VolumeCard";

export const revalidate = 0;

export default async function Home() {
  const volumes = await loadVolumes();

  const volumeData = await Promise.all(
    volumes.map(async (volume) => {
      const { photos } = await loadPhotos(volume.slug);
      return { volume, coverPhoto: photos[0] ?? null, photoCount: photos.length };
    }),
  );

  return (
    <main className="relative min-h-screen">
      <nav className="fixed left-0 right-0 top-0 z-30 flex items-center justify-between gap-4 bg-gradient-to-b from-black/80 to-transparent px-5 pb-6 pt-4 text-[10px] uppercase tracking-[0.28em] text-[#efe7dc]/80 backdrop-blur-[2px] sm:px-10 sm:py-5 sm:text-[11px] sm:tracking-[0.3em]">
        <Link href="/" className="font-display text-base normal-case tracking-normal">
          Rampage
        </Link>
      </nav>

      {/* Hero */}
      <section className="relative z-10 overflow-hidden px-5 pb-0 pt-32 sm:px-10 sm:pt-40">
        <div className="aurora" aria-hidden />
        <div className="relative z-10">
          <p className="mb-4 text-[10px] uppercase tracking-[0.38em] text-[#efe7dc]/50 sm:text-[11px] sm:tracking-[0.42em]">
            Rampage Photography
          </p>
          <h1 className="font-display text-[clamp(3.5rem,14vw,9rem)] leading-[0.92] tracking-[-0.02em]">
            <span className="block">The</span>
            <span className="block italic text-[#efe7dc]/75">Archives.</span>
          </h1>
        </div>
      </section>

      {/* Volume grid */}
      <section className="relative z-10 px-5 pb-24 pt-16 sm:px-10 sm:pb-40 sm:pt-20">
        {volumes.length === 0 ? (
          <div className="py-32 text-center text-sm text-[#efe7dc]/60">
            No volumes yet —{" "}
            <Link href="/admin" className="underline hover:text-[#efe7dc]">
              create one in the admin
            </Link>
            .
          </div>
        ) : (
          <>
            <div className="mb-10 flex items-center justify-between text-[10px] uppercase tracking-[0.35em] text-[#efe7dc]/40 sm:mb-12 sm:text-[11px]">
              <span>Select a volume</span>
              <span>{volumes.length.toString().padStart(2, "0")} volumes</span>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6 lg:gap-8">
              {volumeData.map(({ volume, coverPhoto, photoCount }, i) => (
                <VolumeCard
                  key={volume.slug}
                  volume={volume}
                  coverPhoto={coverPhoto}
                  photoCount={photoCount}
                  index={i}
                />
              ))}
            </div>
          </>
        )}
      </section>

      <footer className="relative z-10 border-t border-[#efe7dc]/10 px-6 py-12 text-[11px] uppercase tracking-[0.3em] text-[#efe7dc]/50 sm:px-10">
        <div className="flex items-center justify-between">
          <span>© {new Date().getFullYear()} Rampage</span>
          <span>Made with light.</span>
        </div>
      </footer>
    </main>
  );
}
