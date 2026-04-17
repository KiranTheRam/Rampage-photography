"use client";

import { useMemo, useState } from "react";
import type { Photo } from "@/lib/photos";
import PhotoTile from "./PhotoTile";
import Lightbox from "./Lightbox";

type Props = { photos: Photo[] };

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

  const cols3 = useMemo(() => columnize(photos, 3), [photos]);
  const cols2 = useMemo(() => columnize(photos, 2), [photos]);

  const open = (p: Photo) => setActive(p);
  const close = () => setActive(null);
  const step = (dir: -1 | 1) => {
    if (!active) return;
    const i = photos.findIndex((p) => p.id === active.id);
    if (i < 0) return;
    const next = photos[(i + dir + photos.length) % photos.length];
    setActive(next);
  };

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
                />
              ))}
            </div>
          ))}
        </div>
      </section>

      <Lightbox
        photo={active}
        onClose={close}
        onPrev={() => step(-1)}
        onNext={() => step(1)}
      />
    </>
  );
}
