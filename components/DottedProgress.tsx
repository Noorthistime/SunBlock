"use client";

import { motion } from "framer-motion";

export default function DottedProgress({ size = 5 }: { size?: number }) {
  const dots = Array.from({ length: size }, (_, i) => i);

  return (
    <div className="flex items-center justify-center space-x-2 py-4">
      {dots.map((dot) => (
        <motion.div
          key={dot}
          className="h-2 w-2 rounded-full bg-accent"
          animate={{
            opacity: [0.15, 1, 0.15],
            scale: [0.9, 1.15, 0.9],
          }}
          transition={{
            duration: 1.2,
            repeat: Infinity,
            delay: dot * 0.15,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  );
}
