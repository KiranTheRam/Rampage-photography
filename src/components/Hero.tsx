"use client";

import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";

export default function Hero({ count }: { count: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });
  const y = useTransform(scrollYProgress, [0, 1], [0, -150]);
  const opacity = useTransform(scrollYProgress, [0, 0.8], [1, 0]);

  return (
    <section
      ref={ref}
      className="relative z-10 flex min-h-[100svh] flex-col justify-end overflow-hidden px-5 pb-16 pt-24 sm:px-10 sm:pb-20 sm:pt-28"
    >
      <div className="aurora" aria-hidden />
      <motion.div style={{ y, opacity }} className="relative z-10">
        <div className="mb-8 flex items-center justify-between gap-4 text-[10px] uppercase tracking-[0.28em] text-[#efe7dc]/60 sm:mb-10 sm:text-[11px] sm:tracking-[0.32em]">
          <span>Vol. I — The Archive</span>
          <span className="text-right">
            {count.toString().padStart(3, "0")} photographs
          </span>
        </div>
        <h1 className="font-display text-[clamp(4.5rem,19vw,12rem)] leading-[0.95] tracking-[-0.02em] sm:leading-[0.88]">
          <motion.span
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1.1, ease: [0.2, 0.7, 0.2, 1] }}
            className="block"
          >
            What stayed
          </motion.span>
          <motion.span
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: 1.1,
              delay: 0.12,
              ease: [0.2, 0.7, 0.2, 1],
            }}
            className="block italic text-[#efe7dc]/80"
          >
            after the moment left.
          </motion.span>
        </h1>
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.4, ease: "easeOut" }}
          className="mt-8 max-w-md text-[13px] leading-relaxed text-[#efe7dc]/65 sm:mt-10 sm:text-sm"
        >
          Moments held still — travel, portraits, weather, and the spaces
          between. Scroll to wander through the archive.
        </motion.p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1.2, delay: 0.9 }}
        className="pointer-events-none absolute bottom-5 right-5 z-10 hidden flex-col items-center text-[10px] uppercase tracking-[0.3em] text-[#efe7dc]/50 sm:right-10 sm:flex"
      >
        <span>Scroll</span>
        <motion.span
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
          className="mt-2 h-8 w-[1px] bg-[#efe7dc]/40"
        />
      </motion.div>
    </section>
  );
}
