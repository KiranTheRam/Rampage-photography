"use client";

import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { useCallback, useRef, useState } from "react";
import type { Photo } from "@/lib/photos";
import { photoSrc } from "@/lib/http";

type Props = { initialPhotos: Photo[] };

export default function AdminClient({ initialPhotos }: Props) {
  const [photos, setPhotos] = useState(initialPhotos);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  const upload = useCallback(async (files: FileList | File[]) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    setError(null);
    const form = new FormData();
    for (const f of Array.from(files)) form.append("files", f);
    const res = await fetch("/api/photos", { method: "POST", body: form });
    if (res.ok) {
      const body = (await res.json()) as { photos: Photo[] };
      setPhotos((prev) => [...body.photos, ...prev]);
    } else {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Upload failed.");
    }
    setUploading(false);
    if (fileInput.current) fileInput.current.value = "";
  }, []);

  const remove = async (id: string) => {
    if (!confirm("Delete this photo?")) return;
    const res = await fetch(`/api/photos/${id}`, { method: "DELETE" });
    if (res.ok) setPhotos((prev) => prev.filter((p) => p.id !== id));
    else setError("Delete failed.");
  };

  const saveMeta = async (id: string, patch: Partial<Photo>) => {
    const res = await fetch(`/api/photos/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    if (res.ok) {
      const body = (await res.json()) as { photo: Photo };
      setPhotos((prev) => prev.map((p) => (p.id === id ? body.photo : p)));
    }
  };

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.reload();
  };

  return (
    <div className="relative z-10 mx-auto max-w-6xl px-5 pb-32 pt-24 sm:px-10 sm:pb-40 sm:pt-28">
      <header className="mb-10 flex flex-col gap-4 sm:mb-12 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[10px] uppercase tracking-[0.28em] text-[#efe7dc]/50 sm:text-[11px] sm:tracking-[0.3em]">
            Admin
          </p>
          <h1 className="mt-2 font-display text-4xl leading-[0.95] sm:text-6xl sm:leading-none">
            Manage the <span className="italic text-[#efe7dc]/70">archive</span>
          </h1>
        </div>
        <button
          onClick={logout}
          data-cursor="hover"
          className="self-start text-[10px] uppercase tracking-[0.28em] text-[#efe7dc]/60 hover:text-[#efe7dc] sm:self-auto sm:text-[11px] sm:tracking-[0.3em]"
        >
          Sign out ↗
        </button>
      </header>

      <section
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          upload(e.dataTransfer.files);
        }}
        className={`relative flex cursor-pointer flex-col items-center justify-center border border-dashed px-4 py-12 text-center transition-colors sm:px-6 sm:py-16 ${
          dragOver
            ? "border-[#efe7dc] bg-[#efe7dc]/5"
            : "border-[#efe7dc]/25 hover:border-[#efe7dc]/60"
        }`}
        onClick={() => fileInput.current?.click()}
        data-cursor="hover"
      >
        <input
          ref={fileInput}
          type="file"
          multiple
          accept="image/jpeg,image/png,image/webp,image/avif"
          className="hidden"
          onChange={(e) => e.target.files && upload(e.target.files)}
        />
        <p className="font-display text-2xl italic text-[#efe7dc]/90 sm:text-3xl">
          {uploading ? "Uploading…" : "Tap to add photos"}
        </p>
        <p className="mt-3 text-[10px] uppercase tracking-[0.25em] text-[#efe7dc]/50 sm:text-[11px] sm:tracking-[0.3em]">
          <span className="hidden sm:inline">or drag files · </span>
          JPG · PNG · WEBP · AVIF
        </p>
        {error && (
          <p className="mt-4 text-sm text-red-300/80" role="alert">
            {error}
          </p>
        )}
      </section>

      <section className="mt-16">
        <div className="mb-6 flex items-end justify-between text-[11px] uppercase tracking-[0.3em] text-[#efe7dc]/50">
          <span>Library</span>
          <span>{photos.length.toString().padStart(3, "0")} photos</span>
        </div>
        <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
          <AnimatePresence>
            {photos.map((p) => (
              <motion.li
                key={p.id}
                layout
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96 }}
                className="group relative overflow-hidden border border-[#efe7dc]/10 bg-[#0b0b0b]"
              >
                <div
                  className="relative"
                  style={{ aspectRatio: `${p.width} / ${p.height}` }}
                >
                  <Image
                    src={photoSrc(p.filename)}
                    alt={p.title || p.filename}
                    fill
                    sizes="(max-width: 768px) 50vw, 25vw"
                    className="object-cover"
                  />
                </div>
                <div className="space-y-2 p-3">
                  <input
                    defaultValue={p.title}
                    placeholder="Title"
                    onBlur={(e) =>
                      e.target.value !== p.title &&
                      saveMeta(p.id, { title: e.target.value })
                    }
                    data-cursor="hover"
                    className="w-full bg-transparent text-sm text-[#efe7dc] placeholder:text-[#efe7dc]/30 focus:outline-none"
                  />
                  <input
                    defaultValue={p.caption}
                    placeholder="Caption"
                    onBlur={(e) =>
                      e.target.value !== p.caption &&
                      saveMeta(p.id, { caption: e.target.value })
                    }
                    data-cursor="hover"
                    className="w-full bg-transparent text-[11px] text-[#efe7dc]/60 placeholder:text-[#efe7dc]/20 focus:outline-none"
                  />
                  <button
                    onClick={() => remove(p.id)}
                    data-cursor="hover"
                    className="text-[10px] uppercase tracking-[0.25em] text-[#efe7dc]/40 transition-colors hover:text-red-300"
                  >
                    Delete
                  </button>
                </div>
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
      </section>
    </div>
  );
}
