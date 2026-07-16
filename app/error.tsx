"use client";

import { useEffect } from "react";
import { AlertCircle, RotateCcw } from "lucide-react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Global boundary error:", error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4 bg-black text-white">
      <div className="glass-panel p-8 max-w-md w-full text-center border border-glass flex flex-col items-center">
        <div className="h-12 w-12 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-500 mb-4 animate-bounce">
          <AlertCircle className="h-6 w-6" />
        </div>
        
        <h2 className="text-xl font-bold font-serif mb-2 text-primary">
          Something went wrong
        </h2>
        <p className="text-sm text-text-secondary mb-6 leading-relaxed">
          {error.message || "An unexpected error occurred while rendering the dashboard. Please try reloading."}
        </p>

        <button
          onClick={() => reset()}
          className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-full bg-accent hover:bg-accent-hover text-white text-sm font-semibold shadow-lg shadow-accent/20 transition-all duration-300 active:scale-95 cursor-pointer"
        >
          <RotateCcw className="h-4 w-4" />
          <span>Reset dashboard</span>
        </button>
      </div>
    </div>
  );
}
