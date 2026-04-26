"use client";

import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { useCallback, useRef, useState } from "react";
import type { Photo } from "@/lib/photos";
import type { Volume } from "@/lib/volumes";
import { photoSrc } from "@/lib/http";

type Props = {
  initialPhotos: Photo[];
  initialVolume: Volume | null;
  allVolumes: Volume[];
};

type Tab = "photos" | "settings";
type TitleOptionsState = {
  loading: boolean;
  options: string[];
  error: string | null;
};

export default function AdminClient({ initialPhotos, initialVolume, allVolumes }: Props) {
  const [volumes, setVolumes] = useState(allVolumes);
  const [selectedVolume, setSelectedVolume] = useState<Volume | null>(initialVolume);
  const [photos, setPhotos] = useState(initialPhotos);
  const [tab, setTab] = useState<Tab>("photos");
  const [titleOptions, setTitleOptions] = useState<Record<string, TitleOptionsState>>({});
  const [titleModalPhotoId, setTitleModalPhotoId] = useState<string | null>(null);
  const [titleGuidance, setTitleGuidance] = useState("");

  // Upload state
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  // New volume form
  const [showNewVolume, setShowNewVolume] = useState(false);
  const [newVolForm, setNewVolForm] = useState({
    displayName: "",
    volumeNumber: "",
    heroText: "",
    slug: "",
  });
  const [newVolError, setNewVolError] = useState<string | null>(null);
  const [creatingVol, setCreatingVol] = useState(false);

  // Settings form
  const [settingsForm, setSettingsForm] = useState({
    displayName: initialVolume?.displayName ?? "",
    volumeNumber: initialVolume?.volumeNumber ?? "",
    heroText: initialVolume?.heroText ?? "",
  });
  const [settingsSaved, setSettingsSaved] = useState(false);
  const [settingsError, setSettingsError] = useState<string | null>(null);

  const switchVolume = useCallback(async (vol: Volume) => {
    setSelectedVolume(vol);
    setSettingsForm({
      displayName: vol.displayName,
      volumeNumber: vol.volumeNumber,
      heroText: vol.heroText,
    });
    setSettingsSaved(false);
    setUploadError(null);
    setTitleOptions({});
    setTitleModalPhotoId(null);
    setTitleGuidance("");
    setTab("photos");
    const res = await fetch(`/api/photos?volume=${encodeURIComponent(vol.slug)}`);
    if (res.ok) {
      const body = (await res.json()) as { photos: Photo[] };
      setPhotos(body.photos);
    }
  }, []);

  const upload = useCallback(
    async (files: FileList | File[]) => {
      if (!files || files.length === 0 || !selectedVolume) return;
      setUploading(true);
      setUploadError(null);
      const form = new FormData();
      for (const f of Array.from(files)) form.append("files", f);
      const res = await fetch(
        `/api/photos?volume=${encodeURIComponent(selectedVolume.slug)}`,
        { method: "POST", body: form },
      );
      if (res.ok) {
        const body = (await res.json()) as { photos: Photo[] };
        setPhotos((prev) => [...body.photos, ...prev]);
      } else {
        const body = await res.json().catch(() => ({}));
        setUploadError(body.error ?? "Upload failed.");
      }
      setUploading(false);
      if (fileInput.current) fileInput.current.value = "";
    },
    [selectedVolume],
  );

  const remove = async (id: string) => {
    if (!selectedVolume || !confirm("Delete this photo?")) return;
    const res = await fetch(
      `/api/photos/${id}?volume=${encodeURIComponent(selectedVolume.slug)}`,
      { method: "DELETE" },
    );
    if (res.ok) setPhotos((prev) => prev.filter((p) => p.id !== id));
    else setUploadError("Delete failed.");
  };

  const saveMeta = async (id: string, patch: Partial<Photo>) => {
    if (!selectedVolume) return;
    const res = await fetch(
      `/api/photos/${id}?volume=${encodeURIComponent(selectedVolume.slug)}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      },
    );
    if (res.ok) {
      const body = (await res.json()) as { photo: Photo };
      setPhotos((prev) => prev.map((p) => (p.id === id ? body.photo : p)));
    }
  };

  const generateTitleOptions = async (photo: Photo, guidance: string) => {
    if (!selectedVolume) return;
    setTitleOptions((prev) => ({
      ...prev,
      [photo.id]: {
        loading: true,
        options: prev[photo.id]?.options ?? [],
        error: null,
      },
    }));

    const res = await fetch(
      `/api/photos/${photo.id}/title-options?volume=${encodeURIComponent(
        selectedVolume.slug,
      )}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ guidance }),
      },
    );
    const body = (await res.json().catch(() => ({}))) as {
      titles?: string[];
      error?: string;
    };

    if (res.ok && Array.isArray(body.titles)) {
      setTitleOptions((prev) => ({
        ...prev,
        [photo.id]: { loading: false, options: body.titles ?? [], error: null },
      }));
    } else {
      setTitleOptions((prev) => ({
        ...prev,
        [photo.id]: {
          loading: false,
          options: prev[photo.id]?.options ?? [],
          error: body.error ?? "Could not generate titles.",
        },
      }));
    }
  };

  const openTitleGenerator = (photo: Photo) => {
    setTitleModalPhotoId(photo.id);
    setTitleGuidance("");
    generateTitleOptions(photo, "");
  };

  const applyTitleOption = async (photoId: string, title: string) => {
    await saveMeta(photoId, { title });
    setTitleModalPhotoId(null);
  };

  const saveSettings = async () => {
    if (!selectedVolume) return;
    setSettingsError(null);
    const res = await fetch(
      `/api/volumes/${encodeURIComponent(selectedVolume.slug)}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settingsForm),
      },
    );
    if (res.ok) {
      const body = (await res.json()) as { volume: Volume };
      const updated = body.volume;
      setSelectedVolume(updated);
      setVolumes((prev) => prev.map((v) => (v.slug === updated.slug ? updated : v)));
      setSettingsSaved(true);
      setTimeout(() => setSettingsSaved(false), 2500);
    } else {
      const body = await res.json().catch(() => ({}));
      setSettingsError(body.error ?? "Save failed.");
    }
  };

  const moveVolume = async (slug: string, action: "move-up" | "move-down") => {
    const res = await fetch(`/api/volumes/${encodeURIComponent(slug)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    if (res.ok) {
      // Reload volumes list
      const vRes = await fetch("/api/volumes");
      if (vRes.ok) {
        const vBody = (await vRes.json()) as { volumes: Volume[] };
        setVolumes(vBody.volumes);
      }
    }
  };

  const createVolume = async () => {
    if (!newVolForm.displayName.trim()) {
      setNewVolError("Display name is required.");
      return;
    }
    setCreatingVol(true);
    setNewVolError(null);
    const res = await fetch("/api/volumes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newVolForm),
    });
    if (res.ok) {
      const body = (await res.json()) as { volume: Volume };
      const created = body.volume;
      setVolumes((prev) => [created, ...prev]);
      setShowNewVolume(false);
      setNewVolForm({ displayName: "", volumeNumber: "", heroText: "", slug: "" });
      switchVolume(created);
    } else {
      const body = await res.json().catch(() => ({}));
      setNewVolError(body.error ?? "Failed to create volume.");
    }
    setCreatingVol(false);
  };

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.reload();
  };

  const titleModalPhoto = titleModalPhotoId
    ? photos.find((p) => p.id === titleModalPhotoId) ?? null
    : null;
  const titleModalState = titleModalPhoto
    ? titleOptions[titleModalPhoto.id] ?? { loading: false, options: [], error: null }
    : null;

  return (
    <div className="relative z-10 mx-auto max-w-[112rem] px-5 pb-32 pt-24 sm:px-8 sm:pb-40 sm:pt-28 lg:px-12">
      {/* Header */}
      <header className="mb-10 flex flex-col gap-4 sm:mb-12 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[10px] uppercase tracking-[0.28em] text-[#efe7dc]/50 sm:text-[11px] sm:tracking-[0.3em]">
            Admin
          </p>
          <h1 className="mt-2 font-display text-4xl leading-[0.95] sm:text-6xl sm:leading-none">
            Manage the{" "}
            <span className="italic text-[#efe7dc]/70">vault</span>
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

      {/* Volume selector */}
      <section className="mb-10 sm:mb-12">
        <div className="mb-4 flex items-center justify-between text-[10px] uppercase tracking-[0.3em] text-[#efe7dc]/40 sm:text-[11px]">
          <span>Volumes</span>
          <button
            onClick={() => setShowNewVolume((v) => !v)}
            data-cursor="hover"
            className="text-[#efe7dc]/60 transition-colors hover:text-[#efe7dc]"
          >
            {showNewVolume ? "Cancel" : "+ New Volume"}
          </button>
        </div>

        {/* New volume form */}
        <AnimatePresence>
          {showNewVolume && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-6 overflow-hidden border border-dashed border-[#efe7dc]/20 p-5 sm:p-6"
            >
              <p className="mb-5 text-[10px] uppercase tracking-[0.3em] text-[#efe7dc]/50 sm:text-[11px]">
                New Volume
              </p>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-[10px] uppercase tracking-[0.25em] text-[#efe7dc]/40">
                    Display Name *
                  </label>
                  <input
                    value={newVolForm.displayName}
                    onChange={(e) =>
                      setNewVolForm((f) => ({ ...f, displayName: e.target.value }))
                    }
                    placeholder="e.g. Street Studies"
                    data-cursor="hover"
                    className="w-full border-b border-[#efe7dc]/20 bg-transparent pb-2 text-sm text-[#efe7dc] placeholder:text-[#efe7dc]/25 focus:border-[#efe7dc]/50 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[10px] uppercase tracking-[0.25em] text-[#efe7dc]/40">
                    Volume Number
                  </label>
                  <input
                    value={newVolForm.volumeNumber}
                    onChange={(e) =>
                      setNewVolForm((f) => ({ ...f, volumeNumber: e.target.value }))
                    }
                    placeholder="e.g. Vol. II"
                    data-cursor="hover"
                    className="w-full border-b border-[#efe7dc]/20 bg-transparent pb-2 text-sm text-[#efe7dc] placeholder:text-[#efe7dc]/25 focus:border-[#efe7dc]/50 focus:outline-none"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="mb-1 block text-[10px] uppercase tracking-[0.25em] text-[#efe7dc]/40">
                    Hero Text (use newline to split into two lines)
                  </label>
                  <textarea
                    value={newVolForm.heroText}
                    onChange={(e) =>
                      setNewVolForm((f) => ({ ...f, heroText: e.target.value }))
                    }
                    placeholder={"e.g. The city breathes\nbetween the frames."}
                    rows={2}
                    data-cursor="hover"
                    className="w-full resize-none border-b border-[#efe7dc]/20 bg-transparent pb-2 text-sm text-[#efe7dc] placeholder:text-[#efe7dc]/25 focus:border-[#efe7dc]/50 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[10px] uppercase tracking-[0.25em] text-[#efe7dc]/40">
                    Folder Slug (auto-generated if blank)
                  </label>
                  <input
                    value={newVolForm.slug}
                    onChange={(e) =>
                      setNewVolForm((f) => ({ ...f, slug: e.target.value }))
                    }
                    placeholder="e.g. Street_Studies"
                    data-cursor="hover"
                    className="w-full border-b border-[#efe7dc]/20 bg-transparent pb-2 text-sm text-[#efe7dc] placeholder:text-[#efe7dc]/25 focus:border-[#efe7dc]/50 focus:outline-none"
                  />
                </div>
              </div>
              {newVolError && (
                <p className="mt-3 text-sm text-red-300/80">{newVolError}</p>
              )}
              <button
                onClick={createVolume}
                disabled={creatingVol}
                data-cursor="hover"
                className="mt-5 text-[10px] uppercase tracking-[0.3em] text-[#efe7dc]/80 transition-colors hover:text-[#efe7dc] disabled:text-[#efe7dc]/30 sm:text-[11px]"
              >
                {creatingVol ? "Creating…" : "Create Volume →"}
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Volume tabs */}
        <div className="flex flex-wrap gap-2">
          {volumes.map((vol, i) => (
            <div key={vol.slug} className="flex items-center gap-1">
              <button
                onClick={() => switchVolume(vol)}
                data-cursor="hover"
                className={`border px-4 py-2 text-[10px] uppercase tracking-[0.25em] transition-colors sm:text-[11px] ${
                  selectedVolume?.slug === vol.slug
                    ? "border-[#efe7dc]/60 text-[#efe7dc]"
                    : "border-[#efe7dc]/15 text-[#efe7dc]/50 hover:border-[#efe7dc]/35 hover:text-[#efe7dc]/80"
                }`}
              >
                {vol.volumeNumber ? `${vol.volumeNumber} · ${vol.displayName}` : vol.displayName}
              </button>
              <div className="flex flex-col gap-0.5">
                <button
                  onClick={() => moveVolume(vol.slug, "move-up")}
                  disabled={i === 0}
                  data-cursor="hover"
                  title="Move up"
                  className="text-[#efe7dc]/30 transition-colors hover:text-[#efe7dc]/70 disabled:opacity-20"
                >
                  ▲
                </button>
                <button
                  onClick={() => moveVolume(vol.slug, "move-down")}
                  disabled={i === volumes.length - 1}
                  data-cursor="hover"
                  title="Move down"
                  className="text-[#efe7dc]/30 transition-colors hover:text-[#efe7dc]/70 disabled:opacity-20"
                >
                  ▼
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Volume content */}
      {selectedVolume ? (
        <>
          {/* Tab switcher */}
          <div className="mb-8 flex gap-6 border-b border-[#efe7dc]/10 sm:mb-10">
            {(["photos", "settings"] as Tab[]).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                data-cursor="hover"
                className={`pb-3 text-[10px] uppercase tracking-[0.3em] transition-colors sm:text-[11px] ${
                  tab === t
                    ? "border-b border-[#efe7dc]/70 text-[#efe7dc]"
                    : "text-[#efe7dc]/40 hover:text-[#efe7dc]/70"
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          <AnimatePresence mode="wait">
            {tab === "photos" ? (
              <motion.div
                key="photos"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                {/* Upload zone */}
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
                    JPG · PNG · WEBP · AVIF · uploading to{" "}
                    <span className="text-[#efe7dc]/70">{selectedVolume.displayName}</span>
                  </p>
                  {uploadError && (
                    <p className="mt-4 text-sm text-red-300/80" role="alert">
                      {uploadError}
                    </p>
                  )}
                </section>

                {/* Photo grid */}
                <section className="mt-16">
                  <div className="mb-6 flex items-end justify-between text-[11px] uppercase tracking-[0.3em] text-[#efe7dc]/50">
                    <span>Library — {selectedVolume.displayName}</span>
                    <span>{photos.length.toString().padStart(3, "0")} photos</span>
                  </div>
                  <ul
                    className="grid gap-5 lg:gap-6"
                    style={{
                      gridTemplateColumns:
                        "repeat(auto-fit, minmax(min(100%, 17rem), 1fr))",
                    }}
                  >
                    <AnimatePresence>
                      {photos.map((p) => (
                        <motion.li
                          key={p.id}
                          layout
                          initial={{ opacity: 0, y: 12 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.96 }}
                          className="group relative flex h-full flex-col overflow-hidden border border-[#efe7dc]/10 bg-[#0b0b0b]"
                        >
                          <div
                            className="relative"
                            style={{ aspectRatio: `${p.width} / ${p.height}` }}
                          >
                            <Image
                              src={photoSrc(p)}
                              alt={p.title || p.filename}
                              fill
                              sizes="(max-width: 640px) 100vw, (max-width: 1280px) 33vw, 18vw"
                              className="object-cover"
                            />
                          </div>
                          <div className="flex flex-1 flex-col p-4">
                            <div className="flex-1 space-y-3">
                              <input
                                key={`${p.id}:${p.title}`}
                                defaultValue={p.title}
                                placeholder="Title"
                                onBlur={(e) =>
                                  e.target.value !== p.title &&
                                  saveMeta(p.id, { title: e.target.value })
                                }
                                data-cursor="hover"
                                className="w-full bg-transparent py-1 font-display text-2xl leading-tight text-[#efe7dc] placeholder:text-[#efe7dc]/30 focus:outline-none"
                              />
                              <div className="grid grid-cols-3 gap-x-3 gap-y-2">
                                <input
                                  defaultValue={p.aperture}
                                  placeholder="f/1.8"
                                  aria-label="Aperture"
                                  onBlur={(e) =>
                                    e.target.value !== p.aperture &&
                                    saveMeta(p.id, { aperture: e.target.value })
                                  }
                                  data-cursor="hover"
                                  className="min-w-0 bg-transparent font-mono text-xs text-[#efe7dc]/65 placeholder:text-[#efe7dc]/25 focus:outline-none"
                                />
                                <input
                                  defaultValue={p.shutterSpeed}
                                  placeholder="1/250"
                                  aria-label="Shutter speed"
                                  onBlur={(e) =>
                                    e.target.value !== p.shutterSpeed &&
                                    saveMeta(p.id, { shutterSpeed: e.target.value })
                                  }
                                  data-cursor="hover"
                                  className="min-w-0 bg-transparent font-mono text-xs text-[#efe7dc]/65 placeholder:text-[#efe7dc]/25 focus:outline-none"
                                />
                                <input
                                  defaultValue={p.iso}
                                  placeholder="ISO"
                                  aria-label="ISO"
                                  onBlur={(e) =>
                                    e.target.value !== p.iso &&
                                    saveMeta(p.id, { iso: e.target.value })
                                  }
                                  data-cursor="hover"
                                  className="min-w-0 bg-transparent font-mono text-xs text-[#efe7dc]/65 placeholder:text-[#efe7dc]/25 focus:outline-none"
                                />
                              </div>
                              <div className="grid grid-cols-3 gap-x-3 gap-y-2">
                                <input
                                  defaultValue={p.camera}
                                  placeholder="Camera"
                                  aria-label="Camera"
                                  onBlur={(e) =>
                                    e.target.value !== p.camera &&
                                    saveMeta(p.id, { camera: e.target.value })
                                  }
                                  data-cursor="hover"
                                  className="min-w-0 bg-transparent font-mono text-xs text-[#efe7dc]/65 placeholder:text-[#efe7dc]/25 focus:outline-none"
                                />
                                <input
                                  defaultValue={p.lens}
                                  placeholder="Lens"
                                  aria-label="Lens"
                                  onBlur={(e) =>
                                    e.target.value !== p.lens &&
                                    saveMeta(p.id, { lens: e.target.value })
                                  }
                                  data-cursor="hover"
                                  className="min-w-0 bg-transparent font-mono text-xs text-[#efe7dc]/65 placeholder:text-[#efe7dc]/25 focus:outline-none"
                                />
                                <input
                                  defaultValue={p.focalLength}
                                  placeholder="35mm"
                                  aria-label="Focal length"
                                  onBlur={(e) =>
                                    e.target.value !== p.focalLength &&
                                    saveMeta(p.id, { focalLength: e.target.value })
                                  }
                                  data-cursor="hover"
                                  className="min-w-0 bg-transparent font-mono text-xs text-[#efe7dc]/65 placeholder:text-[#efe7dc]/25 focus:outline-none"
                                />
                              </div>
                            </div>
                            <div className="mt-5 space-y-2">
                              <button
                                type="button"
                                onClick={() => openTitleGenerator(p)}
                                disabled={titleOptions[p.id]?.loading}
                                data-cursor="hover"
                                className="w-full border border-[#efe7dc]/25 px-3 py-2 text-left text-[11px] uppercase tracking-[0.25em] text-[#efe7dc]/70 transition-colors hover:border-[#efe7dc] hover:bg-[#efe7dc] hover:text-black disabled:border-[#efe7dc]/10 disabled:text-[#efe7dc]/25"
                              >
                                {titleOptions[p.id]?.loading
                                  ? "Generating..."
                                  : "Generate title ideas"}
                              </button>
                              <button
                                type="button"
                                onClick={() => remove(p.id)}
                                data-cursor="hover"
                                className="w-full border border-red-300/60 px-3 py-2 text-left text-[11px] uppercase tracking-[0.25em] text-red-300 transition-colors hover:bg-red-300 hover:text-black"
                              >
                                Delete
                              </button>
                            </div>
                          </div>
                        </motion.li>
                      ))}
                    </AnimatePresence>
                  </ul>
                </section>
              </motion.div>
            ) : (
              <motion.div
                key="settings"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="max-w-xl"
              >
                <div className="space-y-8">
                  <div>
                    <label className="mb-2 block text-[10px] uppercase tracking-[0.3em] text-[#efe7dc]/50 sm:text-[11px]">
                      Display Name
                    </label>
                    <input
                      value={settingsForm.displayName}
                      onChange={(e) =>
                        setSettingsForm((f) => ({ ...f, displayName: e.target.value }))
                      }
                      data-cursor="hover"
                      className="w-full border-b border-[#efe7dc]/20 bg-transparent pb-3 text-xl text-[#efe7dc] focus:border-[#efe7dc]/50 focus:outline-none sm:text-2xl"
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-[10px] uppercase tracking-[0.3em] text-[#efe7dc]/50 sm:text-[11px]">
                      Volume Number
                    </label>
                    <input
                      value={settingsForm.volumeNumber}
                      onChange={(e) =>
                        setSettingsForm((f) => ({ ...f, volumeNumber: e.target.value }))
                      }
                      placeholder="e.g. Vol. I"
                      data-cursor="hover"
                      className="w-full border-b border-[#efe7dc]/20 bg-transparent pb-3 text-xl text-[#efe7dc] placeholder:text-[#efe7dc]/25 focus:border-[#efe7dc]/50 focus:outline-none sm:text-2xl"
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-[10px] uppercase tracking-[0.3em] text-[#efe7dc]/50 sm:text-[11px]">
                      Hero Text{" "}
                      <span className="normal-case tracking-normal text-[#efe7dc]/30">
                        (newline = second italic line)
                      </span>
                    </label>
                    <textarea
                      value={settingsForm.heroText}
                      onChange={(e) =>
                        setSettingsForm((f) => ({ ...f, heroText: e.target.value }))
                      }
                      rows={3}
                      data-cursor="hover"
                      className="w-full resize-none border-b border-[#efe7dc]/20 bg-transparent pb-3 text-xl text-[#efe7dc] focus:border-[#efe7dc]/50 focus:outline-none sm:text-2xl"
                    />
                  </div>

                  {settingsError && (
                    <p className="text-sm text-red-300/80">{settingsError}</p>
                  )}

                  <div className="flex items-center gap-6">
                    <button
                      onClick={saveSettings}
                      data-cursor="hover"
                      className="text-[10px] uppercase tracking-[0.3em] text-[#efe7dc]/80 transition-colors hover:text-[#efe7dc] sm:text-[11px]"
                    >
                      Save Changes →
                    </button>
                    {settingsSaved && (
                      <motion.span
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="text-[10px] uppercase tracking-[0.25em] text-[#efe7dc]/50"
                      >
                        Saved.
                      </motion.span>
                    )}
                  </div>

                  <div className="border-t border-[#efe7dc]/10 pt-6">
                    <p className="text-[10px] uppercase tracking-[0.3em] text-[#efe7dc]/30 sm:text-[11px]">
                      Folder slug
                    </p>
                    <p className="mt-1 font-mono text-sm text-[#efe7dc]/50">
                      {selectedVolume.slug}
                    </p>
                    <p className="mt-2 text-[11px] text-[#efe7dc]/30">
                      To delete this volume, remove the folder from the filesystem and restart the
                      container.
                    </p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </>
      ) : (
        <div className="py-20 text-center text-sm text-[#efe7dc]/40">
          No volumes yet. Create one above.
        </div>
      )}

      <AnimatePresence>
        {titleModalPhoto && titleModalState && (
          <motion.div
            key="title-generator"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4 py-6 backdrop-blur-lg"
            onClick={() => setTitleModalPhotoId(null)}
          >
            <motion.div
              initial={{ opacity: 0, y: 18, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.98 }}
              transition={{ duration: 0.2, ease: [0.2, 0.7, 0.2, 1] }}
              className="max-h-[90vh] w-full max-w-4xl overflow-y-auto border border-[#efe7dc]/15 bg-[#080808] shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="grid gap-0 md:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
                <div className="relative min-h-72 bg-black md:min-h-full">
                  <Image
                    src={photoSrc(titleModalPhoto)}
                    alt={titleModalPhoto.title || titleModalPhoto.filename}
                    fill
                    sizes="(max-width: 768px) 100vw, 40vw"
                    className="object-contain"
                  />
                </div>
                <div className="space-y-6 p-5 sm:p-7">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-[10px] uppercase tracking-[0.28em] text-[#efe7dc]/45 sm:text-[11px]">
                        Title generator
                      </p>
                      <h2 className="mt-2 font-display text-3xl leading-tight text-[#efe7dc]">
                        {titleModalPhoto.title || "Untitled photograph"}
                      </h2>
                    </div>
                    <button
                      type="button"
                      onClick={() => setTitleModalPhotoId(null)}
                      data-cursor="hover"
                      className="shrink-0 border border-[#efe7dc]/20 px-3 py-2 text-sm text-[#efe7dc]/70 transition-colors hover:border-[#efe7dc] hover:bg-[#efe7dc] hover:text-black"
                      aria-label="Close title generator"
                    >
                      X
                    </button>
                  </div>

                  <div>
                    <label className="mb-2 block text-[10px] uppercase tracking-[0.25em] text-[#efe7dc]/45 sm:text-[11px]">
                      Creative direction
                    </label>
                    <textarea
                      value={titleGuidance}
                      onChange={(e) => setTitleGuidance(e.target.value)}
                      rows={3}
                      maxLength={500}
                      placeholder="e.g. darker, more cinematic, less literal, warmer, focus on stillness"
                      data-cursor="hover"
                      className="w-full resize-none border border-[#efe7dc]/15 bg-black/40 p-3 text-sm leading-6 text-[#efe7dc] placeholder:text-[#efe7dc]/25 focus:border-[#efe7dc]/45 focus:outline-none"
                    />
                  </div>

                  <div className="flex flex-col gap-2 sm:flex-row">
                    <button
                      type="button"
                      onClick={() => generateTitleOptions(titleModalPhoto, "")}
                      disabled={titleModalState.loading}
                      data-cursor="hover"
                      className="border border-[#efe7dc]/30 px-4 py-3 text-[11px] uppercase tracking-[0.25em] text-[#efe7dc]/75 transition-colors hover:border-[#efe7dc] hover:bg-[#efe7dc] hover:text-black disabled:border-[#efe7dc]/10 disabled:text-[#efe7dc]/25"
                    >
                      {titleModalState.options.length ? "More title ideas" : "Generate title ideas"}
                    </button>
                    <button
                      type="button"
                      onClick={() => generateTitleOptions(titleModalPhoto, titleGuidance)}
                      disabled={titleModalState.loading || !titleGuidance.trim()}
                      data-cursor="hover"
                      className="border border-[#efe7dc]/30 px-4 py-3 text-[11px] uppercase tracking-[0.25em] text-[#efe7dc]/75 transition-colors hover:border-[#efe7dc] hover:bg-[#efe7dc] hover:text-black disabled:border-[#efe7dc]/10 disabled:text-[#efe7dc]/25"
                    >
                      Use direction
                    </button>
                  </div>

                  {titleModalState.error && (
                    <p className="text-sm text-red-300/80">{titleModalState.error}</p>
                  )}

                  <div className="space-y-2">
                    {titleModalState.loading && (
                      <p className="text-sm text-[#efe7dc]/50">Generating title options...</p>
                    )}
                    {titleModalState.options.map((option) => (
                      <button
                        key={option}
                        type="button"
                        onClick={() => applyTitleOption(titleModalPhoto.id, option)}
                        data-cursor="hover"
                        className="block w-full border border-[#efe7dc]/15 px-4 py-3 text-left font-display text-2xl leading-tight text-[#efe7dc]/80 transition-colors hover:border-[#efe7dc]/50 hover:bg-[#efe7dc] hover:text-black"
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
