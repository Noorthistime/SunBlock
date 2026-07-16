"use client";

import dynamic from "next/dynamic";
import DottedProgress from "./DottedProgress";

const WeatherMap = dynamic(() => import("./WeatherMap"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full min-h-[400px] md:min-h-[500px] rounded-[24px] border border-glass bg-secondary/15 flex flex-col items-center justify-center gap-4">
      <DottedProgress size={6} />
      <span className="text-xs font-semibold text-text-secondary tracking-widest uppercase animate-pulse">
        Initializing Radar Grid...
      </span>
    </div>
  ),
});

export default WeatherMap;
