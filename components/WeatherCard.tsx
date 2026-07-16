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
  MapPin,
} from "lucide-react";
import { WeatherData, LayerType } from "../types/weather";
import { getWeatherDetails } from "../utils/weatherCodes";
import { StyleModeType } from "../hooks/useWeather";
import { motion } from "framer-motion";

interface WeatherCardProps {
  locationName: string;
  data: WeatherData | null;
  activeLayer: LayerType;
  setActiveLayer: (layer: LayerType) => void;
  styleMode: StyleModeType;
}

export default function WeatherCard({
  locationName,
  data,
  activeLayer,
  setActiveLayer,
  styleMode,
}: WeatherCardProps) {
  if (!data) return null;

  const current = data.current;
  const weatherDetails = getWeatherDetails(current.weatherCode);
  const WeatherIcon = weatherDetails.icon;

  const isGallery = styleMode === "gallery";

  // UV description helper
  const getUVDescription = (uv: number) => {
    if (uv <= 2) return "Low";
    if (uv <= 5) return "Moderate";
    if (uv <= 7) return "High";
    return "Very High";
  };

  // Layers metadata
  const layers: { value: LayerType; label: string; icon: any }[] = [
    { value: "temp", label: "Temperature", icon: Thermometer },
    { value: "rain", label: "Precipitation", icon: Droplets },
    { value: "wind", label: "Wind Conditions", icon: Wind },
  ];

  return (
    <div 
      className={`mono-card p-6 md:p-8 flex flex-col justify-between h-full bg-paper ${
        isGallery ? "border-2 border-hairline rounded-none" : "border border-hairline shadow-main rounded-[24px]"
      }`}
    >
      
      {/* Location & Main Temperature Block */}
      <div className="mb-6">
        <div 
          className={`flex items-center gap-1.5 text-xs text-mid-gray uppercase mb-2 ${
            isGallery ? "font-condensed tracking-[0.2em] font-semibold text-[11px]" : "font-semibold tracking-wider"
          }`}
        >
          <MapPin className="h-3.5 w-3.5" />
          <span>{isGallery ? "METEOROLOGICAL STATION" : "CURRENT WEATHER"}</span>
        </div>
        
        <h2 
          className={`font-serif text-ink tracking-tight truncate max-w-[280px] md:max-w-xs mb-1 ${
            isGallery ? "font-sans font-light text-2xl tracking-[-0.02em]" : "text-xl md:text-2xl font-bold"
          }`}
          title={locationName}
        >
          {locationName.split(",")[0].toUpperCase()}
        </h2>
        <p 
          className={`text-xs text-mid-gray truncate max-w-[280px] ${
            isGallery ? "font-condensed tracking-[0.1em] text-[10px] font-medium" : ""
          }`}
        >
          {locationName.split(",").slice(1).join(",").trim().toUpperCase()}
        </p>

        <div className="flex items-center justify-between gap-4 mt-6">
          <div className="flex flex-col">
            <span 
              className={`font-sans tracking-tighter text-ink relative select-none ${
                isGallery ? "text-5xl font-light tracking-[-0.05em] leading-none" : "text-6xl md:text-7xl font-extrabold"
              }`}
            >
              {Math.round(current.temp)}
              <span className={`absolute -top-1 font-light ${isGallery ? "text-3xl ml-1" : "text-4xl md:text-5xl"}`}>°</span>
            </span>
            <span 
              className={`text-xs text-mid-gray mt-1.5 ${
                isGallery ? "font-condensed tracking-[0.15em] font-bold uppercase text-[10px]" : "font-semibold"
              }`}
            >
              {weatherDetails.label.toUpperCase()}
            </span>
          </div>

          <div 
            className={`flex h-16 w-16 items-center justify-center border text-ink bg-canvas/30 ${
              isGallery 
                ? "border-2 border-hairline rounded-none" 
                : "border-hairline rounded-[18px] shadow-sm"
            }`}
          >
            <WeatherIcon className="h-7 w-7 shrink-0" />
          </div>
        </div>
      </div>

      {/* Grid of Weather Stats */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        
        {/* Feels Like */}
        <div 
          className={`flex items-center gap-3 p-3 border bg-canvas/10 ${
            isGallery ? "border-2 border-hairline rounded-none" : "border-hairline/60 rounded-[18px]"
          }`}
        >
          <Thermometer className="h-4.5 w-4.5 text-mid-gray shrink-0" />
          <div>
            <p className={`text-[10px] text-mid-gray tracking-wider uppercase ${isGallery ? "font-condensed tracking-[0.15em] font-semibold text-[9px]" : "font-bold"}`}>
              FEELS LIKE
            </p>
            <p className="text-sm font-bold text-ink">{Math.round(current.feelsLike)}°C</p>
          </div>
        </div>

        {/* Wind Speed */}
        <div 
          className={`flex items-center gap-3 p-3 border bg-canvas/10 ${
            isGallery ? "border-2 border-hairline rounded-none" : "border-hairline/60 rounded-[18px]"
          }`}
        >
          <Wind className="h-4.5 w-4.5 text-mid-gray shrink-0" />
          <div>
            <p className={`text-[10px] text-mid-gray tracking-wider uppercase ${isGallery ? "font-condensed tracking-[0.15em] font-semibold text-[9px]" : "font-bold"}`}>
              WIND SPEED
            </p>
            <p className="text-sm font-bold text-ink">{Math.round(current.windSpeed)} km/h</p>
          </div>
        </div>

        {/* Humidity */}
        <div 
          className={`flex items-center gap-3 p-3 border bg-canvas/10 ${
            isGallery ? "border-2 border-hairline rounded-none" : "border-hairline/60 rounded-[18px]"
          }`}
        >
          <Droplets className="h-4.5 w-4.5 text-mid-gray shrink-0" />
          <div>
            <p className={`text-[10px] text-mid-gray tracking-wider uppercase ${isGallery ? "font-condensed tracking-[0.15em] font-semibold text-[9px]" : "font-bold"}`}>
              HUMIDITY
            </p>
            <p className="text-sm font-bold text-ink">{current.humidity}%</p>
          </div>
        </div>

        {/* Pressure */}
        <div 
          className={`flex items-center gap-3 p-3 border bg-canvas/10 ${
            isGallery ? "border-2 border-hairline rounded-none" : "border-hairline/60 rounded-[18px]"
          }`}
        >
          <Gauge className="h-4.5 w-4.5 text-mid-gray shrink-0" />
          <div>
            <p className={`text-[10px] text-mid-gray tracking-wider uppercase ${isGallery ? "font-condensed tracking-[0.15em] font-semibold text-[9px]" : "font-bold"}`}>
              ATM PRESSURE
            </p>
            <p className="text-sm font-bold text-ink">{Math.round(current.pressure)} hPa</p>
          </div>
        </div>

        {/* UV Index */}
        <div 
          className={`flex items-center gap-3 p-3 border bg-canvas/10 ${
            isGallery ? "border-2 border-hairline rounded-none" : "border-hairline/60 rounded-[18px]"
          }`}
        >
          <ShieldAlert className="h-4.5 w-4.5 text-mid-gray shrink-0" />
          <div>
            <p className={`text-[10px] text-mid-gray tracking-wider uppercase ${isGallery ? "font-condensed tracking-[0.15em] font-semibold text-[9px]" : "font-bold"}`}>
              UV EXPOSURE
            </p>
            <p className="text-sm font-bold text-ink">
              {current.uvIndex}{" "}
              <span className="text-[10px] font-semibold text-mid-gray">
                ({getUVDescription(current.uvIndex)})
              </span>
            </p>
          </div>
        </div>

        {/* Daylight */}
        <div 
          className={`flex items-center gap-3 p-3 border bg-canvas/10 ${
            isGallery ? "border-2 border-hairline rounded-none" : "border-hairline/60 rounded-[18px]"
          }`}
        >
          <Sun className="h-4.5 w-4.5 text-mid-gray shrink-0" />
          <div>
            <p className={`text-[10px] text-mid-gray tracking-wider uppercase ${isGallery ? "font-condensed tracking-[0.15em] font-semibold text-[9px]" : "font-bold"}`}>
              DAYLIGHT
            </p>
            <div className="text-[11px] font-bold text-ink flex items-center gap-1">
              <span>{current.sunrise}</span>
              <Sunset className="h-3 w-3 text-mid-gray shrink-0" />
              <span>{current.sunset}</span>
            </div>
          </div>
        </div>

      </div>

      {/* Weather Layer Toggle Buttons */}
      <div className="border-t border-hairline/50 pt-5 mt-2">
        <div 
          className={`flex items-center gap-1.5 text-xs text-mid-gray uppercase mb-3.5 ${
            isGallery ? "font-condensed tracking-[0.2em] font-semibold text-[11px]" : "font-semibold tracking-wider"
          }`}
        >
          <Layers className="h-4 w-4" />
          <span>RADAR GRID LAYERS</span>
        </div>
        
        <div className="flex flex-col gap-2">
          {layers.map((layer) => {
            const isActive = activeLayer === layer.value;
            return (
              <button
                key={layer.value}
                onClick={() => setActiveLayer(layer.value)}
                className={`flex items-center justify-between w-full px-4 py-2.5 text-sm font-semibold tracking-wide transition-all duration-300 cursor-pointer ${
                  isActive
                    ? isGallery
                      ? "bg-ink text-paper border-2 border-ink rounded-none"
                      : "bg-ink text-paper border border-ink rounded-[18px] shadow-sm"
                    : isGallery
                      ? "bg-transparent text-ink border-2 border-hairline hover:border-ink rounded-none font-medium"
                      : "bg-transparent text-ink border border-hairline hover:border-ink/40 rounded-[18px] font-medium"
                }`}
              >
                <div className="flex items-center gap-2">
                  <layer.icon className="h-4 w-4 shrink-0" />
                  <span className={isGallery ? "font-condensed tracking-[0.1em] uppercase text-xs" : ""}>
                    {layer.label.toUpperCase()}
                  </span>
                </div>
                {isActive && (
                  <span className={`h-1.5 w-1.5 rounded-full ${isGallery ? "bg-paper" : "bg-paper animate-pulse"}`} />
                )}
              </button>
            );
          })}
        </div>
      </div>

    </div>
  );
}
