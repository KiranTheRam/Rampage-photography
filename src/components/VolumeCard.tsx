"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import type { Volume } from "@/lib/volumes";
import type { Photo } from "@/lib/photos";
import { photoSrc } from "@/lib/http";

type Props = {
  volume: Volume;
  coverPhoto: Photo | null;
  photoCount: number;
  index: number;
};

export default function VolumeCard({ volume, coverPhoto, photoCount, index }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 48 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 1.0,
        delay: index * 0.18,
        ease: [0.2, 0.7, 0.2, 1],
      }}
    >
      <Link
        href={`/${volume.slug}`}
        data-cursor="view"
        className="group relative block overflow-hidden"
      >
        <div className="relative aspect-[3/4]">
          {coverPhoto ? (
            <Image
              src={photoSrc(coverPhoto)}
              alt={volume.displayName}
              fill
              sizes="(max-width: 768px) 100vw, 50vw"
              className="object-cover transition-transform duration-[1400ms] ease-out group-hover:scale-[1.06]"
              priority={index < 2}
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-[#1a1a1a] to-[#0a0a0a]" />
          )}

          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/15 to-transparent transition-opacity duration-700 group-hover:opacity-90" />

          {/* Content */}
          <div className="absolute bottom-0 left-0 right-0 translate-y-0 p-6 transition-transform duration-500 group-hover:-translate-y-1 sm:p-8">
            {volume.volumeNumber && (
              <p className="mb-2 text-[10px] uppercase tracking-[0.35em] text-[#efe7dc]/55 sm:text-[11px] sm:tracking-[0.38em]">
                {volume.volumeNumber}
              </p>
            )}
            <h2 className="font-display text-[2.4rem] leading-[0.95] tracking-[-0.01em] text-[#efe7dc] sm:text-[3.2rem]">
              {volume.displayName}
            </h2>
            <div className="mt-5 flex items-center justify-between">
              <span className="text-[10px] uppercase tracking-[0.3em] text-[#efe7dc]/50 sm:text-[11px]">
                {photoCount.toString().padStart(3, "0")} photographs
              </span>
              <motion.span
                className="text-[#efe7dc]/60 transition-colors duration-300 group-hover:text-[#efe7dc]"
                initial={{ x: 0 }}
                whileHover={{ x: 4 }}
              >
                →
              </motion.span>
            </div>
          </div>

          {/* Bottom edge line */}
          <div className="absolute bottom-0 left-0 h-[1px] w-0 bg-[#efe7dc]/50 transition-[width] duration-700 ease-out group-hover:w-full" />
        </div>
      </Link>
    </motion.div>
  );
}
