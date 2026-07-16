"use client";

import { WeatherForecast } from "../types/weather";
import { getWeatherDetails } from "../utils/weatherCodes";
import { Droplets, Wind, Calendar } from "lucide-react";
import { StyleModeType } from "../hooks/useWeather";
import { motion } from "framer-motion";

interface ForecastOverlayProps {
  forecast: WeatherForecast[];
  styleMode: StyleModeType;
}

export default function ForecastOverlay({ forecast, styleMode }: ForecastOverlayProps) {
  if (!forecast || forecast.length === 0) return null;

  const isGallery = styleMode === "gallery";

  // Format date helper: converts "2026-07-16" into "Thu, Jul 16"
  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) {
      return { weekday: "Day", label: dateStr };
    }
    
    const weekday = d.toLocaleDateString("en-US", { weekday: "short" });
    const month = d.toLocaleDateString("en-US", { month: "short" });
    const day = d.getDate();
    return { weekday, label: `${month} ${day}` };
  };

  // Skip today and show next 5 days
  const upcomingForecast = forecast.slice(1, 6);

  // Framer Motion Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05,
      },
    },
  };

  const cardVariants = {
    hidden: { opacity: 0, x: isGallery ? 0 : 15 },
    show: { opacity: 1, x: 0, transition: { type: "tween", duration: 0.25 } },
  };

  return (
    <div className="w-full">
      <div 
        className={`flex items-center gap-1.5 text-xs text-mid-gray uppercase mb-3 pl-1 ${
          isGallery ? "font-condensed tracking-[0.2em] font-semibold text-[11px]" : "font-semibold tracking-wider"
        }`}
      >
        <Calendar className="h-3.5 w-3.5" />
        <span>{isGallery ? "5-DAY METEOROLOGICAL FORECAST" : "5-DAY FORECAST"}</span>
      </div>

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="flex flex-col gap-2.5"
      >
        {upcomingForecast.map((day) => {
          const { weekday, label } = formatDate(day.date);
          const weather = getWeatherDetails(day.weatherCode);
          const Icon = weather.icon;

          return (
            <motion.div
              key={day.date}
              variants={cardVariants}
              whileHover={isGallery ? {} : { x: 4 }}
              className={`mono-card p-3.5 flex items-center justify-between bg-paper relative group ${
                isGallery 
                  ? "border-2 border-hairline rounded-none" 
                  : "border-hairline shadow-sm rounded-[24px]"
              }`}
            >
              {/* Day details */}
              <div className="flex flex-col text-left min-w-[70px]">
                <p 
                  className={`text-xs font-bold text-ink tracking-wide ${
                    isGallery ? "font-condensed tracking-[0.1em] uppercase text-[11px]" : ""
                  }`}
                >
                  {weekday.toUpperCase()}
                </p>
                <p 
                  className={`text-[10px] text-mid-gray ${
                    isGallery ? "font-condensed tracking-[0.08em] font-medium" : ""
                  }`}
                >
                  {label.toUpperCase()}
                </p>
              </div>

              {/* Weather Icon */}
              <div 
                className={`h-8 w-8 flex items-center justify-center border text-mid-gray bg-canvas/30 shrink-0 ${
                  isGallery 
                    ? "border-2 border-hairline rounded-none" 
                    : "border-hairline/60 rounded-lg"
                }`}
              >
                <Icon className="h-4.5 w-4.5 shrink-0" />
              </div>

              {/* Temperature Bounds */}
              <div className="flex items-center gap-2 min-w-[50px] justify-center">
                <span className="text-xs font-bold text-ink">
                  {Math.round(day.tempMax)}°
                </span>
                <span className="text-[10px] font-semibold text-mid-gray">
                  {Math.round(day.tempMin)}°
                </span>
              </div>

              {/* Extras indicators side-by-side */}
              <div 
                className={`flex gap-3 text-[9px] text-mid-gray font-semibold ${
                  isGallery ? "font-condensed tracking-[0.05em]" : ""
                }`}
              >
                <div className="flex items-center gap-0.5">
                  <Droplets className="h-2.5 w-2.5 shrink-0" />
                  <span className="text-ink font-bold">{day.rainProb}%</span>
                </div>
                <div className="flex items-center gap-0.5">
                  <Wind className="h-2.5 w-2.5 shrink-0" />
                  <span className="text-ink font-bold">{Math.round(day.windSpeed)}k</span>
                </div>
              </div>

              {/* Decorative Corner Mark for Gallery */}
              {isGallery && (
                <div className="absolute top-1 right-1 h-1.5 w-1.5 bg-ink" />
              )}
            </motion.div>
          );
        })}
      </motion.div>
    </div>
  );
}
