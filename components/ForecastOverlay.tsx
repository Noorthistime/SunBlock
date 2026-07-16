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
    hidden: { opacity: 0, y: isGallery ? 0 : 15 },
    show: { opacity: 1, y: 0, transition: { type: "tween", duration: 0.25 } },
  };

  return (
    <div className="w-full">
      <div 
        className={`flex items-center gap-1.5 text-xs text-mid-gray uppercase mb-4 pl-1 ${
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
        className="grid grid-cols-2 sm:grid-cols-5 gap-3.5"
      >
        {upcomingForecast.map((day) => {
          const { weekday, label } = formatDate(day.date);
          const weather = getWeatherDetails(day.weatherCode);
          const Icon = weather.icon;

          return (
            <motion.div
              key={day.date}
              variants={cardVariants}
              whileHover={isGallery ? {} : { y: -4 }}
              className={`mono-card p-4 flex flex-col justify-between items-center text-center bg-paper relative group ${
                isGallery 
                  ? "border-2 border-hairline rounded-none" 
                  : "border-hairline shadow-sm rounded-[24px]"
              }`}
            >
              {/* Day details */}
              <div className="mb-2">
                <p 
                  className={`text-xs font-bold text-ink tracking-wide ${
                    isGallery ? "font-condensed tracking-[0.1em] uppercase" : ""
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
                className={`h-10 w-10 flex items-center justify-center border text-mid-gray bg-canvas/30 ${
                  isGallery 
                    ? "border-2 border-hairline rounded-none" 
                    : "border-hairline/60 rounded-xl"
                }`}
              >
                <Icon className="h-5 w-5 shrink-0" />
              </div>

              {/* Temperature Bounds */}
              <div className="flex items-center justify-center gap-2.5 my-2">
                <span className="text-xs font-bold text-ink">
                  {Math.round(day.tempMax)}°
                </span>
                <span className="text-[10px] font-semibold text-mid-gray">
                  {Math.round(day.tempMin)}°
                </span>
              </div>

              {/* Extras Grid */}
              <div 
                className={`w-full border-t border-hairline/40 mt-3 pt-2 flex flex-col gap-1 text-[9px] text-mid-gray font-semibold ${
                  isGallery ? "font-condensed tracking-[0.05em]" : ""
                }`}
              >
                
                {/* Rain probability */}
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-0.5 font-normal">
                    <Droplets className="h-2.5 w-2.5 shrink-0" />
                    <span>RAIN</span>
                  </span>
                  <span className="text-ink font-bold">{day.rainProb}%</span>
                </div>

                {/* Wind max */}
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-0.5 font-normal">
                    <Wind className="h-2.5 w-2.5 shrink-0" />
                    <span>WIND</span>
                  </span>
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
