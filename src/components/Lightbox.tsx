"use client";

import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import type { Photo } from "@/lib/photos";
import { optimizedPhotoSrc, photoSrc } from "@/lib/http";
import CameraMetadata from "./CameraMetadata";

type Props = {
  photo: Photo | null;
  navDirection: -1 | 0 | 1;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
};

const photoMotion = {
  enter: (direction: -1 | 0 | 1) => ({
    opacity: 0,
    y: direction === 0 ? 0 : direction > 0 ? 42 : -42,
    scale: 0.985,
  }),
  center: {
    opacity: 1,
    y: 0,
    scale: 1,
  },
  exit: (direction: -1 | 0 | 1) => ({
    opacity: 0,
    y: direction === 0 ? 0 : direction > 0 ? -30 : 30,
    scale: 0.985,
  }),
};

export default function Lightbox({
  photo,
  navDirection,
  onClose,
  onPrev,
  onNext,
}: Props) {
  const [loadedPhotoId, setLoadedPhotoId] = useState<string | null>(null);
  const loaded = photo ? loadedPhotoId === photo.id : false;

  useEffect(() => {
    if (!photo) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowLeft" || e.key === "ArrowUp") onPrev();
      else if (e.key === "ArrowRight" || e.key === "ArrowDown") onNext();
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
          <AnimatePresence mode="popLayout" custom={navDirection} initial={false}>
          <motion.div
            key={photo.id}
            custom={navDirection}
            variants={photoMotion}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.24, ease: [0.22, 0.8, 0.22, 1] }}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={0.18}
            dragMomentum={false}
            onDragEnd={(_e, info) => {
              if (info.offset.y < -64 || info.velocity.y < -420) onNext();
              else if (info.offset.y > 64 || info.velocity.y > 420) onPrev();
            }}
            className="absolute inset-0 flex h-full w-full touch-none flex-col sm:block"
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
                  <p className="font-display text-3xl leading-tight text-[#efe7dc] md:text-4xl">
                    {photo.title || "Photograph"}
                  </p>
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

            {/* Mobile bottom: metadata + swipe hint */}
            <div className="pointer-events-none flex shrink-0 flex-col items-center gap-3 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2 text-[10px] uppercase tracking-[0.25em] text-[#efe7dc]/40 sm:hidden">
              <CameraMetadata
                photo={photo}
                className="grid w-full max-w-xs grid-cols-3 gap-2 text-center"
                labelClassName="text-[10px]"
                valueClassName="text-xs"
              />
              <span>swipe up/down · tap to close</span>
            </div>
          </motion.div>
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
