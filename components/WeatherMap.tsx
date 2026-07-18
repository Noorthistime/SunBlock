"use client";

import { useState, useEffect, useRef } from "react";
import L from "leaflet";
import { WeatherLayerPoint, LayerType } from "../types/weather";
import { StyleModeType, ThemeType } from "../hooks/useWeather";
import { Plus, Minus, Maximize2, Minimize2, Globe as GlobeIcon, Map as MapIcon } from "lucide-react";
import Globe from "react-globe.gl";

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
  const [viewMode, setViewMode] = useState<"map" | "globe">("map");
  const [dimensions, setDimensions] = useState({ width: 400, height: 400 });

  const containerRef = useRef<HTMLDivElement>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const markersRef = useRef<L.Marker[]>([]);
  const globeRef = useRef<any>(null);

  // Keep a ref to onMapClick to avoid stale closures in Leaflet event listeners
  const onMapClickRef = useRef(onMapClick);
  useEffect(() => {
    onMapClickRef.current = onMapClick;
  }, [onMapClick]);

  // Track parent container dimensions dynamically (for Leaflet and 3D Globe renders)
  useEffect(() => {
    if (!containerRef.current) return;
    const resizeObserver = new ResizeObserver((entries) => {
      for (let entry of entries) {
        setDimensions({
          width: entry.contentRect.width,
          height: entry.contentRect.height,
        });
      }
    });
    resizeObserver.observe(containerRef.current);
    return () => resizeObserver.disconnect();
  }, []);

  // Trigger Leaflet size recalculation when expanded/collapsed or view toggled
  useEffect(() => {
    if (mapRef.current) {
      setTimeout(() => {
        mapRef.current?.invalidateSize();
      }, 250);
    }
  }, [isExpanded, viewMode]);

  // Sync 3D Globe camera view to selected coordinates
  useEffect(() => {
    if (globeRef.current && viewMode === "globe") {
      globeRef.current.pointOfView({ lat, lng: lon, altitude: 2.2 }, 1200);
    }
  }, [lat, lon, viewMode]);

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
    // Guard against NaN coordinates (e.g. when Globe view fires before coords resolve)
    if (!isFinite(lat) || !isFinite(lon)) return;
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

  // 4. Render and update custom layer weather indicators
  useEffect(() => {
    if (!mapRef.current) return;

    // Clear existing markers
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    // Map weather codes/labels
    layers.forEach((point) => {
      let markerHtml = "";
      if (isGallery) {
        // Brutalist sharp square markers
        if (activeLayer === "temp") {
          markerHtml = `
            <div class="flex items-center justify-center font-condensed text-[11px] font-bold h-8 w-8 bg-paper text-ink border-2 border-hairline hover:bg-canvas transition-colors duration-150">
              ${Math.round(point.temperature)}°
            </div>
          `;
        } else if (activeLayer === "rain") {
          markerHtml = `
            <div class="flex items-center justify-center font-condensed text-[11px] font-bold h-8 w-8 bg-paper text-ink border-2 border-hairline hover:bg-canvas transition-colors duration-150">
              ${point.rain}m
            </div>
          `;
        } else if (activeLayer === "wind") {
          const windVal = Math.round(point.windSpeed);
          markerHtml = `
            <div class="flex items-center justify-center font-condensed text-[11px] font-bold h-8 w-8 bg-paper text-ink border-2 border-hairline hover:bg-canvas transition-colors duration-150">
              ${windVal}k
            </div>
          `;
        }
      } else {
        // Frosted capsule markers (or Apple Neo rounded)
        if (activeLayer === "temp") {
          markerHtml = `
            <div class="flex items-center justify-center font-sans font-bold text-xs h-8.5 w-8.5 bg-paper text-ink border border-hairline shadow-md rounded-full hover:border-ink/40 transition-all duration-200">
              ${Math.round(point.temperature)}°
            </div>
          `;
        } else if (activeLayer === "rain") {
          markerHtml = `
            <div class="flex items-center justify-center font-sans font-bold text-[9px] h-8.5 w-8.5 bg-paper text-ink border border-hairline shadow-md rounded-full hover:border-ink/40 transition-all duration-200">
              ${point.rain} mm
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

  // Click handler on 3D Globe — guard against NaN (e.g. clicking on empty space)
  const handleGlobeClick = (click: { lat: number; lng: number }) => {
    if (!isFinite(click.lat) || !isFinite(click.lng)) return;
    onMapClickRef.current(click.lat, click.lng);
  };

  // Selected Location marker for 3D Globe representation
  const activeGlobePoint = [{
    lat,
    lng: lon,
    text: "Selected Coordinate"
  }];

  return (
    <div 
      ref={containerRef}
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
      {/* 2D Leaflet Map Canvas */}
      <div 
        ref={mapContainerRef} 
        className={`w-full h-full min-h-[400px] md:min-h-[500px] z-10 ${
          viewMode === "globe" ? "hidden" : "block"
        }`} 
      />

      {/* 3D Globe WebGL Canvas */}
      {viewMode === "globe" && (
        <div className="w-full h-full z-10 flex items-center justify-center overflow-hidden bg-black/5 dark:bg-white/5 rounded-[inherit]">
          <Globe
            ref={globeRef}
            width={dimensions.width}
            height={dimensions.height}
            globeImageUrl={theme === "dark" ? "https://unpkg.com/three-globe/example/img/earth-night.jpg" : "https://unpkg.com/three-globe/example/img/earth-day.jpg"}
            backgroundColor="rgba(0,0,0,0)"
            onGlobeClick={handleGlobeClick}
            showGraticules={true}
            showAtmosphere={true}
            atmosphereColor={theme === "dark" ? "#444444" : "#cccccc"}
            atmosphereAltitude={0.15}
            labelsData={activeGlobePoint}
            labelLat={(d: any) => d.lat}
            labelLng={(d: any) => d.lng}
            labelText={(d: any) => d.text}
            labelSize={1.6}
            labelColor={() => theme === "dark" ? "#ffffff" : "#000000"}
            labelDotRadius={0.8}
            labelAltitude={0.015}
          />
        </div>
      )}
      
      {/* Dynamic Overlay indicator */}
      <div 
        className={`absolute top-8 left-8 z-20 pointer-events-none px-3 py-1 text-[10px] tracking-wider uppercase font-bold flex items-center gap-1.5 bg-paper ${
          isGallery 
            ? "border-2 border-ink rounded-none font-condensed tracking-[0.25em]" 
            : "border border-hairline shadow-sm rounded-full bg-paper/85 backdrop-blur-md"
        }`}
      >
        <span className="h-1.5 w-1.5 rounded-full bg-ink" />
        <span>{viewMode === "globe" ? "3D GLOBE OVERVIEW" : isGallery ? "GRID SECTOR MAP" : "Sector Grid Map"}</span>
      </div>

      {/* Custom Map Controls Overlay in Bottom Right */}
      <div className="absolute bottom-8 right-8 z-20 flex flex-col gap-2">
        {/* Zoom Controls (hidden in Globe and hidden when not expanded depending on settings) */}
        {!isExpanded && viewMode === "map" && (
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

        {/* Toggle Globe vs Map (Only visible in Expanded Mode) */}
        {isExpanded && (
          <button
            onClick={() => setViewMode(viewMode === "map" ? "globe" : "map")}
            title={viewMode === "map" ? "Switch to Globe View" : "Switch to Map View"}
            className={
              isGallery
                ? "h-10 w-10 flex items-center justify-center bg-paper border-2 border-hairline text-ink hover:bg-canvas font-bold cursor-pointer select-none"
                : "h-10 w-10 flex items-center justify-center rounded-full bg-paper/85 backdrop-blur-md border border-hairline shadow-sm text-ink hover:bg-canvas hover:text-ink/80 transition-all cursor-pointer select-none"
            }
          >
            {viewMode === "map" ? <GlobeIcon className="h-4.5 w-4.5" /> : <MapIcon className="h-4.5 w-4.5" />}
          </button>
        )}

        {/* Toggle Expand (Fullscreen) */}
        <button
          onClick={() => {
            setIsExpanded(!isExpanded);
            // Revert view mode to 2D Map on collapse
            if (isExpanded) {
              setViewMode("map");
            }
          }}
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
