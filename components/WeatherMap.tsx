"use client";

import { useState, useEffect, useRef } from "react";
import L from "leaflet";
import dynamic from "next/dynamic";
import { WeatherLayerPoint, LayerType } from "../types/weather";
import { StyleModeType, ThemeType } from "../hooks/useWeather";
import { Plus, Minus, Maximize2, Minimize2, Globe as GlobeIcon, Map as MapIcon } from "lucide-react";

// Lazy-load GlobePanel — deck.gl (~450 KB) is only downloaded when Globe mode opens
const GlobePanel = dynamic(() => import("./GlobePanel"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center" style={{ background: "#000814" }}>
      <span className="text-white/50 text-[10px] tracking-[0.2em] uppercase animate-pulse">
        Loading Globe…
      </span>
    </div>
  ),
});

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

function validCoord(v: number) {
  return typeof v === "number" && isFinite(v) && !isNaN(v);
}

export default function WeatherMap({
  lat, lon, activeLayer, layers, styleMode, theme, onMarkerClick, onMapClick,
}: WeatherMapProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [viewMode,   setViewMode]   = useState<"map" | "globe">("map");
  const [leafletKey, setLeafletKey] = useState(0); // bump = fresh Leaflet mount

  const containerRef    = useRef<HTMLDivElement>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef          = useRef<L.Map | null>(null);
  const tileLayerRef    = useRef<L.TileLayer | null>(null);
  const markersRef      = useRef<L.Marker[]>([]);
  const onMapClickRef   = useRef(onMapClick);
  useEffect(() => { onMapClickRef.current = onMapClick; }, [onMapClick]);

  // Invalidate Leaflet size on expand toggle (map mode only)
  useEffect(() => {
    if (viewMode === "map" && mapRef.current) {
      setTimeout(() => { mapRef.current?.invalidateSize(); }, 300);
    }
  }, [isExpanded, viewMode]);

  // Switch back to map — bump key so Leaflet remounts with a fresh canvas
  const switchToMap = () => {
    setViewMode("map");
    setLeafletKey(k => k + 1);
  };

  const lightTiles  = "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png";
  const darkTiles   = "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png";
  const attribution = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>';
  const isGallery   = styleMode === "gallery";

  // ── Leaflet init — reruns on leafletKey bump ────────────────────────────────
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; }

    const initLat = validCoord(lat) ? lat : 19.076;
    const initLon = validCoord(lon) ? lon : 72.8777;

    const map = L.map(mapContainerRef.current, {
      center: [initLat, initLon],
      zoom: 9, minZoom: 2, maxZoom: 18,
      zoomControl: false, scrollWheelZoom: true,
      fadeAnimation: true, attributionControl: false,
      maxBounds: [[-85, -180], [85, 180]], maxBoundsViscosity: 1.0,
    });
    mapRef.current = map;

    let clickTimeout: ReturnType<typeof setTimeout> | null = null;
    map.on("click", (e: L.LeafletMouseEvent) => {
      if (clickTimeout) clearTimeout(clickTimeout);
      clickTimeout = setTimeout(() => {
        const { lat: cLat, lng: cLng } = e.latlng;
        if (validCoord(cLat) && validCoord(cLng)) onMapClickRef.current(cLat, cLng);
        clickTimeout = null;
      }, 250);
    });
    map.on("dblclick", () => {
      if (clickTimeout) { clearTimeout(clickTimeout); clickTimeout = null; }
    });

    const tiles = L.tileLayer(theme === "dark" ? darkTiles : lightTiles, {
      attribution, maxZoom: 19, noWrap: true, bounds: [[-85, -180], [85, 180]],
    }).addTo(map);
    tileLayerRef.current = tiles;

    setTimeout(() => { map.invalidateSize(); }, 150);

    return () => {
      if (clickTimeout) clearTimeout(clickTimeout);
      map.off(); map.remove();
      mapRef.current = null;
      tileLayerRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leafletKey]);

  // ── Fly to coord — only when map mode is active ────────────────────────────
  useEffect(() => {
    if (viewMode !== "map") return;           // never touch Leaflet in globe mode
    if (!mapRef.current) return;
    if (!validCoord(lat) || !validCoord(lon)) return;
    try {
      const center = L.latLng(lat, lon);
      const bounds = mapRef.current.getBounds();
      if (bounds && !bounds.contains(center)) {
        mapRef.current.flyTo(center, mapRef.current.getZoom(), { animate: true, duration: 1.5 });
      }
    } catch (_) { /* swallow rare Leaflet edge-case errors */ }
  }, [lat, lon, viewMode]);

  // ── Tile theme swap ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!tileLayerRef.current) return;
    tileLayerRef.current.setUrl(theme === "dark" ? darkTiles : lightTiles);
  }, [theme]);

  // ── Weather layer markers ──────────────────────────────────────────────────
  useEffect(() => {
    if (!mapRef.current) return;
    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];

    layers.forEach(point => {
      let html = "";
      if (isGallery) {
        if (activeLayer === "temp")
          html = `<div class="flex items-center justify-center font-condensed text-[11px] font-bold h-8 w-8 bg-paper text-ink border-2 border-hairline hover:bg-canvas">${Math.round(point.temperature)}°</div>`;
        else if (activeLayer === "rain")
          html = `<div class="flex items-center justify-center font-condensed text-[11px] font-bold h-8 w-8 bg-paper text-ink border-2 border-hairline hover:bg-canvas">${point.rain}m</div>`;
        else if (activeLayer === "wind")
          html = `<div class="flex items-center justify-center font-condensed text-[11px] font-bold h-8 w-8 bg-paper text-ink border-2 border-hairline hover:bg-canvas">${Math.round(point.windSpeed)}k</div>`;
      } else {
        if (activeLayer === "temp")
          html = `<div class="flex items-center justify-center font-sans font-bold text-xs h-8 w-8 bg-paper text-ink border border-hairline shadow-md rounded-full">${Math.round(point.temperature)}°</div>`;
        else if (activeLayer === "rain")
          html = `<div class="flex items-center justify-center font-sans font-bold text-[9px] h-8 w-8 bg-paper text-ink border border-hairline shadow-md rounded-full">${point.rain}mm</div>`;
        else if (activeLayer === "wind") {
          const r = point.windDirection;
          html = `<div class="flex flex-col items-center justify-center font-sans font-bold text-[8px] h-8 w-8 bg-paper text-ink border border-hairline shadow-md rounded-full"><span>${Math.round(point.windSpeed)}</span><svg style="transform:rotate(${r}deg);width:6px;height:6px;fill:currentColor" viewBox="0 0 24 24"><path d="M12,2L4.5,20.29L5.21,21L12,18L18.79,21L19.5,20.29Z"/></svg></div>`;
        }
      }

      if (!html) return;
      const icon = L.divIcon({ className: "custom-mono-icon", html, iconSize: [36, 36], iconAnchor: [18, 18] });
      const marker = L.marker([point.lat, point.lon], { icon })
        .addTo(mapRef.current!)
        .on("click", () => onMarkerClick(point.lat, point.lon, point.name));
      marker.bindTooltip(
        `<div class="p-1 font-sans text-xs bg-paper text-ink"><strong>${point.name}</strong><br/>Temp: ${point.temperature}°C<br/>Rain: ${point.rain}mm<br/>Wind: ${Math.round(point.windSpeed)}km/h</div>`,
        { direction: "top", offset: [0, -10] }
      );
      markersRef.current.push(marker);
    });
  }, [layers, activeLayer, isGallery, onMarkerClick]);

  const btnCls = isGallery
    ? "h-10 w-10 flex items-center justify-center bg-paper border-2 border-hairline text-ink hover:bg-canvas font-bold cursor-pointer select-none"
    : "h-10 w-10 flex items-center justify-center rounded-full bg-paper/85 backdrop-blur-md border border-hairline shadow-sm text-ink hover:bg-canvas transition-all cursor-pointer select-none";

  return (
    <div
      ref={containerRef}
      className={`${
        isExpanded
          ? "fixed inset-0 z-[9999] w-screen h-screen bg-canvas p-4 md:p-6"
          : `relative w-full h-full overflow-hidden ${
              isGallery ? "border-2 border-hairline rounded-none" : "border border-hairline shadow-main rounded-[24px]"
            }`
      }`}
    >
      {/* ── Leaflet 2D Map ── */}
      {viewMode === "map" && (
        <div
          key={leafletKey}
          ref={mapContainerRef}
          className="w-full h-full min-h-[400px] md:min-h-[500px] z-10"
        />
      )}

      {/* ── deck.gl Globe (lazy-loaded, only in expanded mode) ── */}
      {viewMode === "globe" && isExpanded && (
        <div className="absolute inset-0 z-10 overflow-hidden rounded-[inherit]">
          <GlobePanel
            lat={lat}
            lon={lon}
            onLocationClick={(cLat, cLon) => {
              if (validCoord(cLat) && validCoord(cLon)) onMapClick(cLat, cLon);
            }}
          />
        </div>
      )}

      {/* ── Status badge ── */}
      <div
        className={`absolute top-4 left-4 z-20 pointer-events-none px-3 py-1 text-[10px] tracking-wider uppercase font-bold flex items-center gap-1.5 ${
          isGallery
            ? "border-2 border-ink rounded-none font-condensed tracking-[0.25em] bg-paper"
            : "border border-hairline shadow-sm rounded-full bg-paper/85 backdrop-blur-md"
        }`}
      >
        <span className="h-1.5 w-1.5 rounded-full bg-ink" />
        <span>
          {viewMode === "globe"
            ? "Globe View"
            : isGallery ? "GRID SECTOR MAP" : "Sector Grid Map"}
        </span>
      </div>

      {/* ── Controls ── */}
      <div className="absolute bottom-6 right-6 z-20 flex flex-col gap-2">
        {/* Zoom — only in 2D map, non-expanded */}
        {!isExpanded && viewMode === "map" && (
          <>
            <button onClick={() => mapRef.current?.zoomIn()}  title="Zoom In"  className={btnCls}><Plus  className="h-4 w-4" /></button>
            <button onClick={() => mapRef.current?.zoomOut()} title="Zoom Out" className={btnCls}><Minus className="h-4 w-4" /></button>
          </>
        )}

        {/* Globe / Map toggle — expanded mode only */}
        {isExpanded && (
          <button
            onClick={() => viewMode === "map" ? setViewMode("globe") : switchToMap()}
            title={viewMode === "map" ? "Switch to Globe View" : "Switch to Map View"}
            className={btnCls}
          >
            {viewMode === "map" ? <GlobeIcon className="h-4 w-4" /> : <MapIcon className="h-4 w-4" />}
          </button>
        )}

        {/* Expand / Collapse */}
        <button
          onClick={() => {
            const next = !isExpanded;
            setIsExpanded(next);
            if (!next && viewMode === "globe") switchToMap();
          }}
          title={isExpanded ? "Collapse" : "Expand Fullscreen"}
          className={btnCls}
        >
          {isExpanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
}
