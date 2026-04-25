"use client";

import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import type { Photo } from "@/lib/photos";
import { optimizedPhotoSrc, photoSrc } from "@/lib/http";
import CameraMetadata from "./CameraMetadata";

type Props = {
  photo: Photo | null;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
};

export default function Lightbox({ photo, onClose, onPrev, onNext }: Props) {
  const [loadedPhotoId, setLoadedPhotoId] = useState<string | null>(null);
  const loaded = photo ? loadedPhotoId === photo.id : false;

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

            {/* Image area — takes remaining space on mobile, with metadata beside it on desktop */}
            <div className="relative flex-1 px-4 pb-8 sm:grid sm:h-full sm:w-full sm:grid-cols-[minmax(0,1fr)_15rem] sm:gap-7 sm:p-10 md:grid-cols-[minmax(0,1fr)_17rem]">
              <div className="relative h-full min-h-0 w-full">
                <div
                  aria-hidden
                  className={`absolute inset-0 bg-contain bg-center bg-no-repeat blur-sm transition-opacity duration-300 ${
                    loaded ? "opacity-0" : "opacity-100"
                  }`}
                  style={{
                    backgroundImage: `url("${optimizedPhotoSrc(photo, 750)}")`,
                  }}
                />
                <Image
                  src={photoSrc(photo)}
                  alt={photo.title || photo.filename}
                  fill
                  sizes="(max-width: 640px) 100vw, calc(100vw - 19rem)"
                  className={`object-contain transition-opacity duration-300 ${
                    loaded ? "opacity-100" : "opacity-0"
                  }`}
                  priority
                  onLoad={() => setLoadedPhotoId(photo.id)}
                  draggable={false}
                />
              </div>
              <aside className="hidden min-h-0 flex-col justify-center pl-6 pr-12 sm:flex md:pr-14">
                <div className="max-w-full">
                  <p className="truncate text-[11px] uppercase tracking-[0.28em] text-[#efe7dc]/45">
                    {photo.title || "Photograph"}
                  </p>
                  {photo.caption && (
                    <p className="mt-3 text-base leading-7 text-[#efe7dc]/60">
                      {photo.caption}
                    </p>
                  )}
                  <CameraMetadata
                    photo={photo}
                    expanded
                    className="mt-8 grid gap-6"
                    labelClassName="text-[11px]"
                    valueClassName="text-lg"
                  />
                </div>
              </aside>
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
              className="absolute right-4 top-1/2 hidden h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 text-[#efe7dc]/70 backdrop-blur-sm transition-colors hover:bg-[#efe7dc] hover:text-black sm:flex"
              aria-label="Next"
            >
              →
            </button>

            {/* Mobile bottom: caption + swipe hint */}
            <div className="pointer-events-none flex shrink-0 flex-col items-center gap-3 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2 text-[10px] uppercase tracking-[0.25em] text-[#efe7dc]/40 sm:hidden">
              {photo.caption && (
                <span className="max-w-full truncate normal-case tracking-normal text-[#efe7dc]/60">
                  {photo.caption}
                </span>
              )}
              <CameraMetadata
                photo={photo}
                className="grid w-full max-w-xs grid-cols-3 gap-2 text-center"
                labelClassName="text-[10px]"
                valueClassName="text-xs"
              />
              <span>swipe · tap to close</span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
