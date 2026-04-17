"use client";

import { motion } from "framer-motion";
import { useState } from "react";

export default function LoginForm() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    if (res.ok) {
      window.location.reload();
    } else {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Login failed.");
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="relative z-10 mx-auto mt-28 w-full max-w-sm px-5 sm:mt-40 sm:px-6"
    >
      <div className="aurora" aria-hidden />
      <h1 className="font-display text-4xl leading-[0.95] sm:text-5xl sm:leading-none">
        Admin<span className="italic text-[#efe7dc]/70"> access</span>
      </h1>
      <p className="mt-4 text-sm text-[#efe7dc]/60">
        Enter the password to manage photos.
      </p>
      <form onSubmit={submit} className="relative z-10 mt-10 space-y-4">
        <input
          type="password"
          required
          autoFocus
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          data-cursor="hover"
          className="w-full border border-[#efe7dc]/20 bg-black/40 px-4 py-3 text-[#efe7dc] placeholder:text-[#efe7dc]/30 focus:border-[#efe7dc]/60 focus:outline-none"
        />
        {error && (
          <p className="text-sm text-red-300/80" role="alert">
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={loading}
          data-cursor="hover"
          className="group flex w-full items-center justify-between border border-[#efe7dc]/30 px-4 py-3 text-[11px] uppercase tracking-[0.3em] transition-colors hover:bg-[#efe7dc] hover:text-black disabled:opacity-50"
        >
          <span>{loading ? "Checking…" : "Enter"}</span>
          <span className="transition-transform group-hover:translate-x-1">
            →
          </span>
        </button>
      </form>
    </motion.div>
  );
}
