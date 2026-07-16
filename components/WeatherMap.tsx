"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import { WeatherLayerPoint, LayerType, ThemeType } from "../types/weather";

interface WeatherMapProps {
  lat: number;
  lon: number;
  activeLayer: LayerType;
  layers: WeatherLayerPoint[];
  theme: ThemeType;
  onMarkerClick: (lat: number, lon: number, name: string) => void;
}

export default function WeatherMap({
  lat,
  lon,
  activeLayer,
  layers,
  theme,
  onMarkerClick,
}: WeatherMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const markersRef = useRef<L.Marker[]>([]);

  const lightTiles = "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png";
  const darkTiles = "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png";
  const attribution = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>';

  // 1. Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    // Initialize leaflet map
    const map = L.map(mapContainerRef.current, {
      center: [lat, lon],
      zoom: 9,
      zoomControl: true,
      scrollWheelZoom: true,
      fadeAnimation: true,
    });

    mapRef.current = map;

    // Add Tile Layer
    const tileLayer = L.tileLayer(theme === "dark" ? darkTiles : lightTiles, {
      attribution,
      maxZoom: 19,
    }).addTo(map);

    tileLayerRef.current = tileLayer;

    // Fix leaflet resize issue
    setTimeout(() => {
      map.invalidateSize();
    }, 100);

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // 2. Synchronize center when lat/lon updates
  useEffect(() => {
    if (!mapRef.current) return;
    const currentCenter = mapRef.current.getCenter();
    const targetCenter = L.latLng(lat, lon);

    if (currentCenter.distanceTo(targetCenter) > 500) {
      mapRef.current.flyTo(targetCenter, 9.5, {
        animate: true,
        duration: 1.5,
      });
    }
  }, [lat, lon]);

  // 3. Switch tiles when theme changes
  useEffect(() => {
    if (!tileLayerRef.current) return;
    tileLayerRef.current.setUrl(theme === "dark" ? darkTiles : lightTiles);
  }, [theme]);

  // 4. Render markers for the active weather layer
  useEffect(() => {
    if (!mapRef.current || !layers || layers.length === 0) return;

    // Clear old markers
    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = [];

    // Create new markers
    layers.forEach((point) => {
      let markerHtml = "";
      let colorClass = "bg-accent";
      let textShadow = "text-shadow";

      if (activeLayer === "temp") {
        const tempVal = Math.round(point.temperature);
        if (tempVal <= 10) {
          colorClass = "bg-[#2f80ed]"; // Cold Blue
        } else if (tempVal <= 22) {
          colorClass = "bg-[#27ae60]"; // Green
        } else if (tempVal <= 30) {
          colorClass = "bg-[#f2994a]"; // Orange
        } else {
          colorClass = "bg-[#ff2d55]"; // Hot Red
        }
        markerHtml = `
          <div class="flex items-center justify-center font-sans font-bold text-xs h-9 w-9 rounded-full ${colorClass} text-white border-2 border-white shadow-lg shadow-black/30 transition-all duration-300">
            ${tempVal}°
          </div>
        `;
      } else if (activeLayer === "rain") {
        const rainVal = point.rain;
        if (rainVal === 0) {
          colorClass = "bg-zinc-500/80 border-zinc-200";
          markerHtml = `
            <div class="flex flex-col items-center justify-center font-sans font-bold text-[9px] h-9 w-9 rounded-full ${colorClass} text-white border-2 shadow-lg shadow-black/30">
              <span>0</span>
              <span class="text-[7px] font-normal">mm</span>
            </div>
          `;
        } else {
          colorClass = "bg-[#2f80ed] border-white";
          markerHtml = `
            <div class="flex flex-col items-center justify-center font-sans font-bold text-[9px] h-9 w-9 rounded-full ${colorClass} text-white border-2 shadow-lg shadow-black/30 animate-pulse">
              <span>${rainVal}</span>
              <span class="text-[7px] font-normal">mm</span>
            </div>
          `;
        }
      } else if (activeLayer === "wind") {
        colorClass = "bg-zinc-800 dark:bg-zinc-900 border-accent";
        const windVal = Math.round(point.windSpeed);
        const rotation = point.windDirection;
        markerHtml = `
          <div class="flex flex-col items-center justify-center font-sans font-bold text-[9px] h-10 w-10 rounded-full ${colorClass} text-white border-2 shadow-lg shadow-black/30">
            <span class="text-[9px] text-accent">${windVal}</span>
            <svg style="transform: rotate(${rotation}deg); width: 8px; height: 8px; fill: white;" viewBox="0 0 24 24" class="transition-transform duration-500">
              <path d="M12,2L4.5,20.29L5.21,21L12,18L18.79,21L19.5,20.29L12,2Z" />
            </svg>
          </div>
        `;
      }

      const customIcon = L.divIcon({
        className: "custom-div-icon",
        html: markerHtml,
        iconSize: [36, 36],
        iconAnchor: [18, 18],
      });

      const marker = L.marker([point.lat, point.lon], { icon: customIcon })
        .addTo(mapRef.current!)
        .on("click", () => {
          onMarkerClick(point.lat, point.lon, `${point.name} Weather Grid`);
        });

      // Bind simple popup on hover
      marker.bindTooltip(`
        <div class="p-1 font-sans text-xs">
          <strong>Grid Area: ${point.name}</strong><br/>
          Temp: ${point.temperature}°C<br/>
          Precip: ${point.rain} mm<br/>
          Wind: ${Math.round(point.windSpeed)} km/h
        </div>
      `, { direction: "top", offset: [0, -10] });

      markersRef.current.push(marker);
    });
  }, [layers, activeLayer, onMarkerClick]);

  return (
    <div className="relative w-full h-full rounded-[24px] overflow-hidden border border-glass shadow-glass bg-secondary/15">
      <div ref={mapContainerRef} className="w-full h-full min-h-[400px] md:min-h-[500px] z-10" />
      
      {/* Decorative Aura Overlay */}
      <div className="absolute top-4 left-4 z-20 pointer-events-none rounded-xl glass-capsule border border-glass px-3 py-1 text-[10px] uppercase font-bold text-accent tracking-wider shadow-sm flex items-center gap-1.5 bg-secondary/85 backdrop-blur-md">
        <span className="h-1.5 w-1.5 rounded-full bg-accent animate-ping" />
        <span>Live Radar Layer</span>
      </div>
    </div>
  );
}
