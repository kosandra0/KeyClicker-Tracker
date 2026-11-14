"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";

// Re-mounted on every navigation -> gentle slide-in page transition.
export default function Template({ children }: { children: ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 18 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}
