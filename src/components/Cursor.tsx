"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { motion, useMotionValue, useSpring } from "framer-motion";

function subscribe(onStoreChange: () => void) {
  const mq = window.matchMedia("(hover: hover) and (pointer: fine)");
  mq.addEventListener("change", onStoreChange);
  return () => mq.removeEventListener("change", onStoreChange);
}

function getSnapshot() {
  return window.matchMedia("(hover: hover) and (pointer: fine)").matches;
}

export default function Cursor() {
  const x = useMotionValue(-100);
  const y = useMotionValue(-100);
  const enabled = useSyncExternalStore(subscribe, getSnapshot, () => false);
  const [variant, setVariant] = useState<"default" | "hover" | "view">(
    "default",
  );
  const lastMove = useRef(0);

  const sx = useSpring(x, { stiffness: 1400, damping: 50, mass: 0.1 });
  const sy = useSpring(y, { stiffness: 1400, damping: 50, mass: 0.1 });

  useEffect(() => {
    if (!enabled) return;
    const onMove = (e: PointerEvent) => {
      x.set(e.clientX);
      y.set(e.clientY);
      lastMove.current = performance.now();
      const el = e.target as HTMLElement | null;
      if (!el) return;
      if (el.closest("[data-cursor='view']")) setVariant("view");
      else if (el.closest("a, button, [data-cursor='hover']"))
        setVariant("hover");
      else setVariant("default");
    };
    window.addEventListener("pointermove", onMove);
    return () => window.removeEventListener("pointermove", onMove);
  }, [enabled, x, y]);

  if (!enabled) return null;

  const size =
    variant === "view" ? 84 : variant === "hover" ? 48 : 18;
  const label = variant === "view" ? "view" : "";

  return (
    <>
      <motion.div
        aria-hidden
        className="pointer-events-none fixed left-0 top-0 z-[70] mix-blend-difference"
        style={{ x: sx, y: sy }}
      >
        <motion.div
          animate={{ width: size, height: size }}
          transition={{ type: "spring", stiffness: 260, damping: 24 }}
          className="flex items-center justify-center rounded-full bg-[#efe7dc] text-[11px] font-medium uppercase tracking-[0.18em] text-black"
          style={{ transform: "translate(-50%, -50%)" }}
        >
          {label}
        </motion.div>
      </motion.div>
      {/* Trailing dot for precision */}
      <motion.div
        aria-hidden
        className="pointer-events-none fixed left-0 top-0 z-[71] h-1 w-1 rounded-full bg-[#efe7dc]"
        style={{
          x,
          y,
          translateX: "-50%",
          translateY: "-50%",
        }}
      />
    </>
  );
}
