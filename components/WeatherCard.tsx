"use client";

import {
  Thermometer,
  Wind,
  Droplets,
  Gauge,
  Sun,
  Sunset,
  ShieldAlert,
  Layers,
  Map,
} from "lucide-react";
import { WeatherData, LayerType } from "../types/weather";
import { getWeatherDetails } from "../utils/weatherCodes";
import { motion } from "framer-motion";

interface WeatherCardProps {
  locationName: string;
  data: WeatherData | null;
  activeLayer: LayerType;
  setActiveLayer: (layer: LayerType) => void;
}

export default function WeatherCard({
  locationName,
  data,
  activeLayer,
  setActiveLayer,
}: WeatherCardProps) {
  if (!data) return null;

  const current = data.current;
  const weatherDetails = getWeatherDetails(current.weatherCode);
  const WeatherIcon = weatherDetails.icon;

  // UV description helper
  const getUVDescription = (uv: number) => {
    if (uv <= 2) return "Low";
    if (uv <= 5) return "Moderate";
    if (uv <= 7) return "High";
    if (uv <= 10) return "Very High";
    return "Extreme";
  };

  const getUVColor = (uv: number) => {
    if (uv <= 2) return "text-green-500";
    if (uv <= 5) return "text-orange-400";
    if (uv <= 7) return "text-orange-600";
    return "text-red-500";
  };

  // Layers metadata
  const layers: { value: LayerType; label: string; icon: any }[] = [
    { value: "temp", label: "Temperature", icon: Thermometer },
    { value: "rain", label: "Precipitation", icon: Droplets },
    { value: "wind", label: "Wind Conditions", icon: Wind },
  ];

  return (
    <div className="glass-panel p-6 md:p-8 flex flex-col justify-between h-full border border-glass shadow-glass">
      
      {/* Location & Main Temperature Block */}
      <div className="mb-6">
        <div className="flex items-center gap-1.5 text-xs font-semibold tracking-widest text-text-secondary uppercase mb-2">
          <Map className="h-3.5 w-3.5 text-accent" />
          <span>CURRENT WEATHER</span>
        </div>
        
        <h2 className="text-xl md:text-2xl font-bold font-serif text-primary tracking-tight truncate max-w-[280px] md:max-w-xs mb-1" title={locationName}>
          {locationName.split(",")[0]}
        </h2>
        <p className="text-xs text-text-secondary mb-6 truncate max-w-[280px]">
          {locationName.split(",").slice(1).join(",").trim()}
        </p>

        <div className="flex items-center justify-between gap-4">
          <div className="flex flex-col">
            <span className="text-6xl md:text-7xl font-extrabold tracking-tighter text-primary font-sans relative select-none">
              {Math.round(current.temp)}
              <span className="text-accent absolute -top-1 text-4xl md:text-5xl font-light">°</span>
            </span>
            <span className="text-sm font-semibold text-text-secondary mt-1">
              {weatherDetails.label}
            </span>
          </div>

          <motion.div
            animate={{ y: [0, -6, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            className="flex h-20 w-20 items-center justify-center rounded-3xl bg-secondary/35 border border-glass text-accent shadow-[0_8px_24px_var(--accent-color-glow)]"
          >
            <WeatherIcon className="h-10 w-10 shrink-0" />
          </motion.div>
        </div>
      </div>

      {/* Grid of Weather Stats */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        
        {/* Feels Like */}
        <div className="flex items-center gap-3 p-3 rounded-2xl bg-secondary/25 border border-glass/40 hover:bg-secondary/45 transition-colors">
          <Thermometer className="h-5 w-5 text-accent shrink-0" />
          <div>
            <p className="text-[10px] font-bold text-text-secondary tracking-wider uppercase">Feels Like</p>
            <p className="text-sm font-bold text-primary">{Math.round(current.feelsLike)}°C</p>
          </div>
        </div>

        {/* Wind Speed */}
        <div className="flex items-center gap-3 p-3 rounded-2xl bg-secondary/25 border border-glass/40 hover:bg-secondary/45 transition-colors">
          <Wind className="h-5 w-5 text-accent shrink-0" />
          <div>
            <p className="text-[10px] font-bold text-text-secondary tracking-wider uppercase">Wind</p>
            <p className="text-sm font-bold text-primary">{Math.round(current.windSpeed)} km/h</p>
          </div>
        </div>

        {/* Humidity */}
        <div className="flex items-center gap-3 p-3 rounded-2xl bg-secondary/25 border border-glass/40 hover:bg-secondary/45 transition-colors">
          <Droplets className="h-5 w-5 text-accent shrink-0" />
          <div>
            <p className="text-[10px] font-bold text-text-secondary tracking-wider uppercase">Humidity</p>
            <p className="text-sm font-bold text-primary">{current.humidity}%</p>
          </div>
        </div>

        {/* Pressure */}
        <div className="flex items-center gap-3 p-3 rounded-2xl bg-secondary/25 border border-glass/40 hover:bg-secondary/45 transition-colors">
          <Gauge className="h-5 w-5 text-accent shrink-0" />
          <div>
            <p className="text-[10px] font-bold text-text-secondary tracking-wider uppercase">Pressure</p>
            <p className="text-sm font-bold text-primary">{Math.round(current.pressure)} hPa</p>
          </div>
        </div>

        {/* UV Index */}
        <div className="flex items-center gap-3 p-3 rounded-2xl bg-secondary/25 border border-glass/40 hover:bg-secondary/45 transition-colors">
          <ShieldAlert className="h-5 w-5 text-accent shrink-0" />
          <div>
            <p className="text-[10px] font-bold text-text-secondary tracking-wider uppercase">UV Index</p>
            <p className="text-sm font-bold text-primary">
              {current.uvIndex}{" "}
              <span className={`text-[10px] font-semibold ${getUVColor(current.uvIndex)}`}>
                ({getUVDescription(current.uvIndex)})
              </span>
            </p>
          </div>
        </div>

        {/* Sunrise/Sunset */}
        <div className="flex items-center gap-3 p-3 rounded-2xl bg-secondary/25 border border-glass/40 hover:bg-secondary/45 transition-colors">
          <Sun className="h-5 w-5 text-accent shrink-0" />
          <div>
            <p className="text-[10px] font-bold text-text-secondary tracking-wider uppercase">Daylight</p>
            <div className="text-[11px] font-bold text-primary flex items-center gap-1">
              <span>{current.sunrise}</span>
              <Sunset className="h-3 w-3 text-text-secondary shrink-0" />
              <span>{current.sunset}</span>
            </div>
          </div>
        </div>

      </div>

      {/* Weather Layer Toggle Buttons */}
      <div className="border-t border-glass/40 pt-6">
        <div className="flex items-center gap-1 text-xs font-semibold tracking-widest text-text-secondary uppercase mb-3.5">
          <Layers className="h-4 w-4 text-accent shrink-0" />
          <span>MAP LAYERS</span>
        </div>
        
        <div className="flex flex-col gap-2">
          {layers.map((layer) => {
            const Icon = layer.icon;
            const isActive = activeLayer === layer.value;
            return (
              <button
                key={layer.value}
                onClick={() => setActiveLayer(layer.value)}
                className={`flex items-center justify-between w-full px-4 py-3 rounded-2xl border text-sm font-semibold tracking-wide transition-all duration-300 ${
                  isActive
                    ? "bg-accent text-white border-accent shadow-[0_0_12px_var(--accent-color-glow)]"
                    : "bg-secondary/20 text-primary border-glass/50 hover:bg-secondary/50 hover:border-accent/30"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon className="h-4.5 w-4.5" />
                  <span>{layer.label}</span>
                </div>
                {isActive && (
                  <span className="h-2 w-2 rounded-full bg-white animate-pulse" />
                )}
              </button>
            );
          })}
        </div>
      </div>

    </div>
  );
}
