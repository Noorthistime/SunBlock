"use client";

import { Sun } from "lucide-react";
import DottedProgress from "../components/DottedProgress";

export default function Loading() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-black text-white p-4">
      <div className="flex flex-col items-center gap-4">
        <div className="relative flex h-14 w-14 items-center justify-center rounded-full bg-accent text-white shadow-[0_0_24px_var(--accent-color-glow)] animate-pulse">
          <Sun className="h-7 w-7 animate-spin-slow" />
        </div>
        <h1 className="font-serif text-2xl font-black tracking-tight text-white">
          SUN<span className="text-accent">BLOCK</span>
        </h1>
        <p className="text-xs font-semibold tracking-widest text-zinc-500 uppercase">
          Loading Systems
        </p>
        <DottedProgress size={6} />
      </div>
    </div>
  );
}
