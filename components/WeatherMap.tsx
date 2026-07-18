"use client";

import { useState, useEffect, useRef } from "react";
import L from "leaflet";
import { WeatherLayerPoint, LayerType } from "../types/weather";
import { StyleModeType, ThemeType } from "../hooks/useWeather";
import { Plus, Minus, Maximize2, Minimize2 } from "lucide-react";

interface WeatherMapProps {
  lat: number;
  lon: number;
  activeLayer: LayerType;
  layers: WeatherLayerPoint[];
  styleMode: StyleModeType;
  theme: ThemeType;
  onMarkerClick: (lat: number, lon: number, name: string) => void;
  onMapClick: (lat: number, lon: number) => void;
}

export default function WeatherMap({
  lat,
  lon,
  activeLayer,
  layers,
  styleMode,
  theme,
  onMarkerClick,
  onMapClick,
}: WeatherMapProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const markersRef = useRef<L.Marker[]>([]);

  // Keep a ref to onMapClick to avoid stale closures in Leaflet event listeners
  const onMapClickRef = useRef(onMapClick);
  useEffect(() => {
    onMapClickRef.current = onMapClick;
  }, [onMapClick]);

  // Trigger Leaflet size recalculation when expanded/collapsed
  useEffect(() => {
    if (mapRef.current) {
      setTimeout(() => {
        mapRef.current?.invalidateSize();
      }, 250);
    }
  }, [isExpanded]);

  // CartoDB tiles (Positron for light, Dark Matter for dark)
  const lightTiles = "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png";
  const darkTiles = "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png";
  const attribution = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>';

  const isGallery = styleMode === "gallery";

  // 1. Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [lat, lon],
      zoom: 9,
      minZoom: 2,
      maxZoom: 18,
      zoomControl: false,
      scrollWheelZoom: true,
      fadeAnimation: true,
      attributionControl: false,
      maxBounds: [
        [-85, -180],
        [85, 180]
      ],
      maxBoundsViscosity: 1.0,
    });

    mapRef.current = map;

    // Bind map click handler with double-click protection (clears timeout on double click zoom-in)
    let clickTimeout: NodeJS.Timeout | null = null;

    map.on("click", (e: L.LeafletMouseEvent) => {
      if (clickTimeout) {
        clearTimeout(clickTimeout);
      }
      
      clickTimeout = setTimeout(() => {
        const { lat: clickLat, lng: clickLng } = e.latlng;
        onMapClickRef.current(clickLat, clickLng);
        clickTimeout = null;
      }, 250);
    });

    map.on("dblclick", () => {
      if (clickTimeout) {
        clearTimeout(clickTimeout);
        clickTimeout = null;
      }
    });

    // Add Tile Layer
    const tileLayer = L.tileLayer(theme === "dark" ? darkTiles : lightTiles, {
      attribution,
      maxZoom: 19,
      noWrap: true,
      bounds: [
        [-85, -180],
        [85, 180]
      ]
    }).addTo(map);

    tileLayerRef.current = tileLayer;

    // Fix leaflet resize issue
    setTimeout(() => {
      map.invalidateSize();
    }, 100);

    return () => {
      if (clickTimeout) {
        clearTimeout(clickTimeout);
      }
      if (mapRef.current) {
        mapRef.current.off("click");
        mapRef.current.off("dblclick");
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // 2. Synchronize center when lat/lon updates
  useEffect(() => {
    if (!mapRef.current) return;
    const targetCenter = L.latLng(lat, lon);
    const bounds = mapRef.current.getBounds();

    // Only pan/fly if the target coordinate is not already within the map's visible viewport bounds
    if (!bounds.contains(targetCenter)) {
      mapRef.current.flyTo(targetCenter, mapRef.current.getZoom(), {
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

      if (isGallery) {
        // Brutalist sharp square markers
        if (activeLayer === "temp") {
          const tempVal = Math.round(point.temperature);
          markerHtml = `
            <div class="flex items-center justify-center font-condensed font-bold text-xs h-9 w-9 bg-paper text-ink border-2 border-ink shadow-none rounded-none hover:bg-ink hover:text-paper transition-colors duration-150">
              ${tempVal}°
            </div>
          `;
        } else if (activeLayer === "rain") {
          const rainVal = point.rain;
          markerHtml = `
            <div class="flex flex-col items-center justify-center font-condensed font-bold text-[8px] h-9 w-9 bg-paper text-ink border-2 border-ink shadow-none rounded-none hover:bg-ink hover:text-paper transition-colors duration-150">
              <span class="leading-none">${rainVal}</span>
              <span class="text-[6px] tracking-widest font-normal uppercase leading-none mt-0.5">MM</span>
            </div>
          `;
        } else if (activeLayer === "wind") {
          const windVal = Math.round(point.windSpeed);
          const rotation = point.windDirection;
          markerHtml = `
            <div class="flex flex-col items-center justify-center font-condensed font-bold text-[8px] h-9 w-9 bg-paper text-ink border-2 border-ink shadow-none rounded-none hover:bg-ink hover:text-paper transition-colors duration-150">
              <span class="leading-none">${windVal}K</span>
              <svg style="transform: rotate(${rotation}deg); width: 6px; height: 6px; fill: currentColor;" viewBox="0 0 24 24" class="mt-1 transition-transform">
                <path d="M12,2L4.5,20.29L5.21,21L12,18L18.79,21L19.5,20.29L12,2Z" />
              </svg>
            </div>
          `;
        }
      } else {
        // Frosted capsule markers
        if (activeLayer === "temp") {
          const tempVal = Math.round(point.temperature);
          markerHtml = `
            <div class="flex items-center justify-center font-sans font-bold text-xs h-8 w-8 bg-paper text-ink border border-hairline shadow-md rounded-full hover:border-ink/40 transition-all duration-200">
              ${tempVal}°
            </div>
          `;
        } else if (activeLayer === "rain") {
          const rainVal = point.rain;
          markerHtml = `
            <div class="flex flex-col items-center justify-center font-sans font-bold text-[9px] h-8.5 w-8.5 bg-paper text-ink border border-hairline shadow-md rounded-full hover:border-ink/40 transition-all duration-200">
              <span class="leading-none">${rainVal}</span>
              <span class="text-[6px] text-mid-gray leading-none">mm</span>
            </div>
          `;
        } else if (activeLayer === "wind") {
          const windVal = Math.round(point.windSpeed);
          const rotation = point.windDirection;
          markerHtml = `
            <div class="flex flex-col items-center justify-center font-sans font-bold text-[8px] h-8.5 w-8.5 bg-paper text-ink border border-hairline shadow-md rounded-full hover:border-ink/40 transition-all duration-200">
              <span class="leading-none">${windVal}</span>
              <svg style="transform: rotate(${rotation}deg); width: 6px; height: 6px; fill: currentColor;" viewBox="0 0 24 24" class="mt-0.5 transition-transform text-mid-gray">
                <path d="M12,2L4.5,20.29L5.21,21L12,18L18.79,21L19.5,20.29L12,2Z" />
              </svg>
            </div>
          `;
        }
      }

      const customIcon = L.divIcon({
        className: "custom-mono-icon",
        html: markerHtml,
        iconSize: [36, 36],
        iconAnchor: [18, 18],
      });

      const marker = L.marker([point.lat, point.lon], { icon: customIcon })
        .addTo(mapRef.current!)
        .on("click", () => {
          onMarkerClick(point.lat, point.lon, point.name);
        });

      // Bind simple tooltip
      marker.bindTooltip(`
        <div class="p-1 font-sans text-xs bg-paper text-ink">
          <strong>Grid Area: ${point.name}</strong><br/>
          Temp: ${point.temperature}°C<br/>
          Precip: ${point.rain} mm<br/>
          Wind: ${Math.round(point.windSpeed)} km/h
        </div>
      `, { direction: "top", offset: [0, -10] });

      markersRef.current.push(marker);
    });
  }, [layers, activeLayer, isGallery, onMarkerClick]);

  return (
    <div 
      className={`${
        isExpanded
          ? "fixed inset-0 z-[9999] w-screen h-screen bg-canvas p-4 md:p-6"
          : `relative w-full h-full overflow-hidden ${
              isGallery 
                ? "border-2 border-hairline rounded-none" 
                : "border border-hairline shadow-main rounded-[24px]"
            }`
      }`}
    >
      <div ref={mapContainerRef} className="w-full h-full min-h-[400px] md:min-h-[500px] z-10" />
      
      {/* Dynamic Overlay indicator */}
      <div 
        className={`absolute top-8 left-8 z-20 pointer-events-none px-3 py-1 text-[10px] tracking-wider uppercase font-bold flex items-center gap-1.5 bg-paper ${
          isGallery 
            ? "border-2 border-ink rounded-none font-condensed tracking-[0.25em]" 
            : "border border-hairline shadow-sm rounded-full bg-paper/85 backdrop-blur-md"
        }`}
      >
        <span className="h-1.5 w-1.5 rounded-full bg-ink" />
        <span>{isGallery ? "GRID SECTOR MAP" : "Sector Grid Map"}</span>
      </div>

      {/* Custom Map Controls Overlay in Bottom Right */}
      <div className="absolute bottom-8 right-8 z-20 flex flex-col gap-2">
        {!isExpanded && (
          <>
            {/* Zoom In */}
            <button
              onClick={() => mapRef.current?.zoomIn()}
              title="Zoom In"
              className={
                isGallery
                  ? "h-10 w-10 flex items-center justify-center bg-paper border-2 border-hairline text-ink hover:bg-canvas font-bold cursor-pointer select-none"
                  : "h-10 w-10 flex items-center justify-center rounded-full bg-paper/85 backdrop-blur-md border border-hairline shadow-sm text-ink hover:bg-canvas hover:text-ink/80 transition-all cursor-pointer select-none"
              }
            >
              <Plus className="h-4.5 w-4.5" />
            </button>

            {/* Zoom Out */}
            <button
              onClick={() => mapRef.current?.zoomOut()}
              title="Zoom Out"
              className={
                isGallery
                  ? "h-10 w-10 flex items-center justify-center bg-paper border-2 border-hairline text-ink hover:bg-canvas font-bold cursor-pointer select-none"
                  : "h-10 w-10 flex items-center justify-center rounded-full bg-paper/85 backdrop-blur-md border border-hairline shadow-sm text-ink hover:bg-canvas hover:text-ink/80 transition-all cursor-pointer select-none"
              }
            >
              <Minus className="h-4.5 w-4.5" />
            </button>
          </>
        )}

        {/* Toggle Expand (Fullscreen) */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          title={isExpanded ? "Collapse Map" : "Expand Map"}
          className={
            isGallery
              ? "h-10 w-10 flex items-center justify-center bg-paper border-2 border-hairline text-ink hover:bg-canvas font-bold cursor-pointer select-none"
              : "h-10 w-10 flex items-center justify-center rounded-full bg-paper/85 backdrop-blur-md border border-hairline shadow-sm text-ink hover:bg-canvas hover:text-ink/80 transition-all cursor-pointer select-none"
          }
        >
          {isExpanded ? <Minimize2 className="h-4.5 w-4.5" /> : <Maximize2 className="h-4.5 w-4.5" />}
        </button>
      </div>
    </div>
  );
}
