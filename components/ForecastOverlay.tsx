"use client";

import { WeatherForecast } from "../types/weather";
import { getWeatherDetails } from "../utils/weatherCodes";
import { Droplets, Wind, ShieldAlert, Calendar } from "lucide-react";
import { motion } from "framer-motion";

interface ForecastOverlayProps {
  forecast: WeatherForecast[];
}

export default function ForecastOverlay({ forecast }: ForecastOverlayProps) {
  if (!forecast || forecast.length === 0) return null;

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
        staggerChildren: 0.08,
      },
    },
  };

  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 100, damping: 15 } },
  };

  return (
    <div className="w-full">
      <div className="flex items-center gap-1.5 text-xs font-semibold tracking-widest text-text-secondary uppercase mb-4 pl-1">
        <Calendar className="h-3.5 w-3.5 text-accent" />
        <span>5-DAY FORECAST OVERLAY</span>
      </div>

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="grid grid-cols-2 sm:grid-cols-5 gap-3.5"
      >
        {upcomingForecast.map((day, idx) => {
          const { weekday, label } = formatDate(day.date);
          const weather = getWeatherDetails(day.weatherCode);
          const Icon = weather.icon;

          return (
            <motion.div
              key={day.date}
              variants={cardVariants}
              whileHover={{ y: -4, scale: 1.02 }}
              className="glass-panel p-4 flex flex-col justify-between items-center text-center border border-glass shadow-sm hover:border-accent/30 bg-secondary/15 transition-all duration-300 relative group"
            >
              {/* Day details */}
              <div className="mb-2">
                <p className="text-xs font-extrabold text-primary tracking-wide">
                  {weekday}
                </p>
                <p className="text-[10px] text-text-secondary">
                  {label}
                </p>
              </div>

              {/* Weather Icon */}
              <div className="h-10 w-10 flex items-center justify-center rounded-xl bg-secondary/35 border border-glass/40 text-accent group-hover:shadow-[0_0_12px_var(--accent-color-glow)] transition-all duration-300 my-2">
                <Icon className="h-5.5 w-5.5 shrink-0" />
              </div>

              {/* Temperature Bounds */}
              <div className="flex items-center justify-center gap-2.5 my-1">
                <span className="text-xs font-extrabold text-primary">
                  {Math.round(day.tempMax)}°
                </span>
                <span className="text-[10px] font-semibold text-text-secondary">
                  {Math.round(day.tempMin)}°
                </span>
              </div>

              {/* Extras Grid */}
              <div className="w-full border-t border-glass/30 mt-3 pt-2 flex flex-col gap-1 text-[9px] text-text-secondary font-semibold">
                
                {/* Rain probability */}
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-0.5">
                    <Droplets className="h-2.5 w-2.5 text-accent shrink-0" />
                    <span>Rain</span>
                  </span>
                  <span className="text-primary">{day.rainProb}%</span>
                </div>

                {/* Wind max */}
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-0.5">
                    <Wind className="h-2.5 w-2.5 text-accent shrink-0" />
                    <span>Wind</span>
                  </span>
                  <span className="text-primary">{Math.round(day.windSpeed)}k</span>
                </div>

              </div>

              {/* Top Accent Dot decoration */}
              <div className="absolute top-1.5 right-1.5 h-1.5 w-1.5 rounded-full bg-accent/20 group-hover:bg-accent transition-colors duration-300" />
            </motion.div>
          );
        })}
      </motion.div>
    </div>
  );
}
