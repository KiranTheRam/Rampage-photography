"use client";

import Image from "next/image";
import { motion, useScroll, useTransform } from "framer-motion";
import { useRef, useState } from "react";
import type { Photo } from "@/lib/photos";
import { photoSrc } from "@/lib/http";
import CameraMetadata from "./CameraMetadata";

type Props = {
  photo: Photo;
  index: number;
  priority?: boolean;
  onOpen: (p: Photo) => void;
  onWarm?: (p: Photo) => void;
};

export default function PhotoTile({
  photo,
  index,
  priority = false,
  onOpen,
  onWarm,
}: Props) {
  const ref = useRef<HTMLButtonElement>(null);
  const [loaded, setLoaded] = useState(false);

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });
  // Subtle parallax — each tile drifts at a slightly different rate.
  const drift = 24 + (index % 3) * 12;
  const y = useTransform(scrollYProgress, [0, 1], [drift, -drift]);

  return (
    <motion.button
      ref={ref}
      type="button"
      onClick={() => onOpen(photo)}
      onFocus={() => onWarm?.(photo)}
      onPointerEnter={() => onWarm?.(photo)}
      onPointerDown={() => onWarm?.(photo)}
      data-cursor="view"
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-10% 0px -10% 0px" }}
      transition={{
        duration: 0.9,
        delay: Math.min(index * 0.04, 0.35),
        ease: [0.2, 0.7, 0.2, 1],
      }}
      className="group relative mb-4 block w-full overflow-hidden bg-[#0b0b0b] text-left sm:mb-6"
      style={{ aspectRatio: `${photo.width} / ${photo.height}` }}
      aria-label={photo.title || photo.filename}
    >
      <motion.div style={{ y }} className="absolute inset-[-6%]">
        <Image
          src={photoSrc(photo)}
          alt={photo.title || photo.filename}
          fill
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          className="photo-fade object-cover transition-transform duration-[1200ms] ease-out group-hover:scale-[1.04]"
          data-loaded={loaded ? "true" : "false"}
          onLoad={() => setLoaded(true)}
          priority={priority}
        />
      </motion.div>

      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100 group-focus-visible:opacity-100" />

      <div className="pointer-events-none absolute bottom-0 left-0 right-0 translate-y-1 p-3 opacity-0 transition-all duration-500 group-hover:translate-y-0 group-hover:opacity-100 group-focus-visible:translate-y-0 group-focus-visible:opacity-100 sm:p-4">
        <CameraMetadata
          photo={photo}
          className="grid grid-cols-3 gap-2"
          labelClassName="text-[10px] sm:text-[11px]"
          valueClassName="text-xs sm:text-sm"
        />
      </div>
    </motion.button>
  );
}
