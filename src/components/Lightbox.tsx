"use client";

import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect } from "react";
import type { Photo } from "@/lib/photos";
import { photoSrc } from "@/lib/http";

type Props = {
  photo: Photo | null;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
};

export default function Lightbox({ photo, onClose, onPrev, onNext }: Props) {
  useEffect(() => {
    if (!photo) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowLeft") onPrev();
      else if (e.key === "ArrowRight") onNext();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [photo, onClose, onPrev, onNext]);

  return (
    <AnimatePresence>
      {photo && (
        <motion.div
          key="lightbox"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.35 }}
          className="fixed inset-0 z-50 bg-black/95 backdrop-blur-xl"
          style={{ height: "100dvh" }}
          onClick={onClose}
        >
          <motion.div
            key={photo.id}
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.45, ease: [0.2, 0.7, 0.2, 1] }}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.2}
            onDragEnd={(_e, info) => {
              if (info.offset.x < -80 || info.velocity.x < -500) onNext();
              else if (info.offset.x > 80 || info.velocity.x > 500) onPrev();
            }}
            className="relative flex h-full w-full touch-pan-y flex-col sm:block"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Mobile top bar — close button lives above the image */}
            <div className="flex shrink-0 items-center justify-between px-4 pb-2 pt-[max(0.75rem,env(safe-area-inset-top))] sm:hidden">
              <span className="text-[10px] uppercase tracking-[0.28em] text-[#efe7dc]/60">
                {photo.title || "Photograph"}
              </span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onClose();
                }}
                className="flex h-11 w-11 items-center justify-center rounded-full bg-[#efe7dc]/10 text-lg text-[#efe7dc] transition-colors hover:bg-[#efe7dc] hover:text-black"
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            {/* Image area — takes remaining space on mobile, full size on desktop */}
            <div className="relative flex-1 px-4 pb-14 sm:h-full sm:w-full sm:p-10 sm:pb-10">
              <div className="relative h-full w-full">
                <Image
                  src={photoSrc(photo)}
                  alt={photo.title || photo.filename}
                  fill
                  sizes="100vw"
                  className="object-contain"
                  priority
                  draggable={false}
                />
              </div>
            </div>

            {/* Desktop-only close button */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onClose();
              }}
              data-cursor="hover"
              className="absolute right-4 top-4 hidden h-11 w-11 items-center justify-center rounded-full bg-black/50 text-lg text-[#efe7dc]/80 backdrop-blur-sm transition-colors hover:bg-[#efe7dc] hover:text-black sm:flex"
              aria-label="Close"
            >
              ✕
            </button>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onPrev();
              }}
              data-cursor="hover"
              className="absolute left-2 top-1/2 hidden h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 text-[#efe7dc]/70 backdrop-blur-sm transition-colors hover:bg-[#efe7dc] hover:text-black sm:flex"
              aria-label="Previous"
            >
              ←
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onNext();
              }}
              data-cursor="hover"
              className="absolute right-2 top-1/2 hidden h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 text-[#efe7dc]/70 backdrop-blur-sm transition-colors hover:bg-[#efe7dc] hover:text-black sm:flex"
              aria-label="Next"
            >
              →
            </button>

            {/* Desktop caption */}
            {(photo.title || photo.caption) && (
              <div className="pointer-events-none absolute bottom-6 left-10 right-10 hidden items-end justify-between text-[11px] uppercase tracking-[0.25em] text-[#efe7dc]/70 sm:flex">
                <span className="truncate">{photo.title}</span>
                <span className="truncate normal-case tracking-normal text-[#efe7dc]/50">
                  {photo.caption}
                </span>
              </div>
            )}

            {/* Mobile bottom: caption + swipe hint */}
            <div className="pointer-events-none flex shrink-0 flex-col items-center gap-1 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2 text-[10px] uppercase tracking-[0.25em] text-[#efe7dc]/40 sm:hidden">
              {photo.caption && (
                <span className="max-w-full truncate normal-case tracking-normal text-[#efe7dc]/60">
                  {photo.caption}
                </span>
              )}
              <span>swipe · tap to close</span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
