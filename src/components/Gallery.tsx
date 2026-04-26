"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { Photo } from "@/lib/photos";
import { optimizedPhotoSrc } from "@/lib/http";
import PhotoTile from "./PhotoTile";
import Lightbox from "./Lightbox";

type Props = { photos: Photo[] };

const LIGHTBOX_PLACEHOLDER_PRELOAD_WIDTH = 750;
const LIGHTBOX_FULL_PRELOAD_WIDTH = 2048;
const warmedPhotos = new Set<string>();

// Distribute photos across N columns greedily by shortest column — gives
// a balanced masonry that respects source order without JS-layout.
function columnize(photos: Photo[], columns: number): Photo[][] {
  const cols: Photo[][] = Array.from({ length: columns }, () => []);
  const heights = new Array(columns).fill(0);
  for (const p of photos) {
    const ratio = p.height / Math.max(p.width, 1);
    let idx = 0;
    for (let i = 1; i < columns; i++) {
      if (heights[i] < heights[idx]) idx = i;
    }
    cols[idx].push(p);
    heights[idx] += ratio;
  }
  return cols;
}

export default function Gallery({ photos }: Props) {
  const [active, setActive] = useState<Photo | null>(null);
  const [navDirection, setNavDirection] = useState<-1 | 0 | 1>(0);

  const cols3 = useMemo(() => columnize(photos, 3), [photos]);
  const cols2 = useMemo(() => columnize(photos, 2), [photos]);

  const warmPhoto = useCallback((p: Photo) => {
    if (typeof window === "undefined") return;

    for (const width of [
      LIGHTBOX_PLACEHOLDER_PRELOAD_WIDTH,
      LIGHTBOX_FULL_PRELOAD_WIDTH,
    ]) {
      const src = optimizedPhotoSrc(p, width);
      if (warmedPhotos.has(src)) continue;

      warmedPhotos.add(src);
      const image = new window.Image();
      image.decoding = "async";
      image.src = src;
    }
  }, []);

  const open = (p: Photo) => {
    warmPhoto(p);
    setNavDirection(0);
    setActive(p);
  };
  const close = () => setActive(null);
  const step = (dir: -1 | 1) => {
    if (!active) return;
    const i = photos.findIndex((p) => p.id === active.id);
    if (i < 0) return;
    const next = photos[(i + dir + photos.length) % photos.length];
    warmPhoto(next);
    setNavDirection(dir);
    setActive(next);
  };

  useEffect(() => {
    if (!active) return;

    const i = photos.findIndex((p) => p.id === active.id);
    if (i < 0) return;

    warmPhoto(photos[(i + 1) % photos.length]);
    warmPhoto(photos[(i - 1 + photos.length) % photos.length]);
  }, [active, photos, warmPhoto]);

  return (
    <>
      <section
        id="gallery"
        className="relative z-10 px-3 pb-24 pt-4 sm:px-8 sm:pb-40"
      >
        {/* mobile: single column */}
        <div className="block sm:hidden">
          {photos.map((p, i) => (
            <PhotoTile
              key={p.id}
              photo={p}
              index={i}
              priority={i < 2}
              onOpen={open}
              onWarm={warmPhoto}
            />
          ))}
        </div>
        {/* tablet: 2 columns */}
        <div className="hidden sm:grid sm:grid-cols-2 sm:gap-6 lg:hidden">
          {cols2.map((col, ci) => (
            <div key={ci}>
              {col.map((p, i) => (
                <PhotoTile
                  key={p.id}
                  photo={p}
                  index={ci * 100 + i}
                  priority={i === 0}
                  onOpen={open}
                  onWarm={warmPhoto}
                />
              ))}
            </div>
          ))}
        </div>
        {/* desktop: 3 columns */}
        <div className="hidden lg:grid lg:grid-cols-3 lg:gap-8">
          {cols3.map((col, ci) => (
            <div
              key={ci}
              style={{ transform: `translateY(${ci === 1 ? "3rem" : ci === 2 ? "1.25rem" : "0"})` }}
            >
              {col.map((p, i) => (
                <PhotoTile
                  key={p.id}
                  photo={p}
                  index={ci * 100 + i}
                  priority={i === 0}
                  onOpen={open}
                  onWarm={warmPhoto}
                />
              ))}
            </div>
          ))}
        </div>
      </section>

      <Lightbox
        photo={active}
        navDirection={navDirection}
        onClose={close}
        onPrev={() => step(-1)}
        onNext={() => step(1)}
      />
    </>
  );
}
