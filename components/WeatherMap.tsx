"use client";

import { useState, useEffect, useRef } from "react";
import L from "leaflet";
import "maplibre-gl/dist/maplibre-gl.css";
import { WeatherLayerPoint, LayerType } from "../types/weather";
import { StyleModeType, ThemeType } from "../hooks/useWeather";
import { Plus, Minus, Maximize2, Minimize2, Globe as GlobeIcon, Map as MapIcon } from "lucide-react";

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

// ─── Embedded Globe component using MapLibre GL ───────────────────────────────
interface GlobeViewProps {
  lat: number;
  lon: number;
  theme: ThemeType;
  onLocationClick: (lat: number, lon: number) => void;
}

function GlobeView({ lat, lon, theme, onLocationClick }: GlobeViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const onClickRef = useRef(onLocationClick);

  useEffect(() => { onClickRef.current = onLocationClick; }, [onLocationClick]);

  useEffect(() => {
    let maplibre: any;
    let cancelled = false;

    async function init() {
      if (!containerRef.current) return;

      // Dynamically import MapLibre GL to avoid SSR
      maplibre = await import("maplibre-gl");

      if (cancelled || !containerRef.current) return;

      const lightStyle = "https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json";
      const darkStyle  = "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json";

      const map = new maplibre.Map({
        container: containerRef.current,
        style: theme === "dark" ? darkStyle : lightStyle,
        center: [isFinite(lon) ? lon : 72.8777, isFinite(lat) ? lat : 19.076],
        zoom: 1.8,
        attributionControl: false,
        // Globe projection — tiles render crisply at any zoom
        projection: "globe" as any,
      });

      mapRef.current = map;

      // Click handler — MapLibre always returns valid lngLat on globe surface
      map.on("click", (e: any) => {
        const clickLat = e.lngLat.lat;
        const clickLon = e.lngLat.lng;
        if (!isFinite(clickLat) || !isFinite(clickLon)) return;
        onClickRef.current(clickLat, clickLon);
      });

      // Marker at selected location
      if (isFinite(lat) && isFinite(lon)) {
        const el = document.createElement("div");
        el.style.cssText = `
          width: 14px; height: 14px;
          border-radius: 50%;
          background: ${theme === "dark" ? "#ffffff" : "#000000"};
          border: 3px solid ${theme === "dark" ? "#000000" : "#ffffff"};
          box-shadow: 0 0 0 2px ${theme === "dark" ? "#ffffff44" : "#00000044"};
          cursor: pointer;
        `;
        const marker = new maplibre.Marker({ element: el })
          .setLngLat([lon, lat])
          .addTo(map);
        markerRef.current = marker;
      }
    }

    init();

    return () => {
      cancelled = true;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
      markerRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [theme]); // Remount on theme change (style swap)

  // Fly to and update marker when selected coord changes
  useEffect(() => {
    if (!mapRef.current || !isFinite(lat) || !isFinite(lon)) return;
    mapRef.current.flyTo({ center: [lon, lat], duration: 1200 });
    if (markerRef.current) {
      markerRef.current.setLngLat([lon, lat]);
    }
  }, [lat, lon]);

  return (
    <div
      ref={containerRef}
      className="w-full h-full"
      style={{ cursor: "crosshair" }}
    />
  );
}
// ─────────────────────────────────────────────────────────────────────────────


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

  const containerRef    = useRef<HTMLDivElement>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef          = useRef<L.Map | null>(null);
  const tileLayerRef    = useRef<L.TileLayer | null>(null);
  const markersRef      = useRef<L.Marker[]>([]);

  // Stable ref so Leaflet callbacks never see a stale closure
  const onMapClickRef = useRef(onMapClick);
  useEffect(() => { onMapClickRef.current = onMapClick; }, [onMapClick]);

  // Trigger Leaflet size recalculation when expanded/collapsed or view toggled
  useEffect(() => {
    if (mapRef.current) {
      setTimeout(() => { mapRef.current?.invalidateSize(); }, 300);
    }
  }, [isExpanded, viewMode]);

  // CartoDB tiles
  const lightTiles  = "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png";
  const darkTiles   = "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png";
  const attribution = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>';

  const isGallery = styleMode === "gallery";

  // ── 1. Init Leaflet map ────────────────────────────────────────────────────
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [
        isFinite(lat) ? lat : 19.076,
        isFinite(lon) ? lon : 72.8777,
      ],
      zoom: 9,
      minZoom: 2,
      maxZoom: 18,
      zoomControl: false,
      scrollWheelZoom: true,
      fadeAnimation: true,
      attributionControl: false,
      maxBounds: [[-85, -180], [85, 180]],
      maxBoundsViscosity: 1.0,
    });

    mapRef.current = map;

    let clickTimeout: NodeJS.Timeout | null = null;

    map.on("click", (e: L.LeafletMouseEvent) => {
      if (clickTimeout) clearTimeout(clickTimeout);
      clickTimeout = setTimeout(() => {
        const { lat: cLat, lng: cLng } = e.latlng;
        if (isFinite(cLat) && isFinite(cLng)) {
          onMapClickRef.current(cLat, cLng);
        }
        clickTimeout = null;
      }, 250);
    });

    map.on("dblclick", () => {
      if (clickTimeout) { clearTimeout(clickTimeout); clickTimeout = null; }
    });

    const tileLayer = L.tileLayer(theme === "dark" ? darkTiles : lightTiles, {
      attribution,
      maxZoom: 19,
      noWrap: true,
      bounds: [[-85, -180], [85, 180]],
    }).addTo(map);

    tileLayerRef.current = tileLayer;
    setTimeout(() => { map.invalidateSize(); }, 100);

    return () => {
      if (clickTimeout) clearTimeout(clickTimeout);
      map.off("click");
      map.off("dblclick");
      map.remove();
      mapRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── 2. Fly to new lat/lon ─────────────────────────────────────────────────
  useEffect(() => {
    if (!mapRef.current) return;
    if (!isFinite(lat) || !isFinite(lon)) return;          // ← hard guard
    if (isNaN(lat) || isNaN(lon)) return;                  // ← belt-and-suspenders
    try {
      const targetCenter = L.latLng(lat, lon);
      const bounds = mapRef.current.getBounds();
      if (!bounds.contains(targetCenter)) {
        mapRef.current.flyTo(targetCenter, mapRef.current.getZoom(), {
          animate: true,
          duration: 1.5,
        });
      }
    } catch {
      // swallow any remaining Leaflet latLng validation errors
    }
  }, [lat, lon]);

  // ── 3. Theme tile swap ────────────────────────────────────────────────────
  useEffect(() => {
    if (!tileLayerRef.current) return;
    tileLayerRef.current.setUrl(theme === "dark" ? darkTiles : lightTiles);
  }, [theme]);

  // ── 4. Weather layer markers ──────────────────────────────────────────────
  useEffect(() => {
    if (!mapRef.current) return;
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    layers.forEach((point) => {
      let markerHtml = "";
      if (isGallery) {
        if (activeLayer === "temp") {
          markerHtml = `<div class="flex items-center justify-center font-condensed text-[11px] font-bold h-8 w-8 bg-paper text-ink border-2 border-hairline hover:bg-canvas transition-colors duration-150">${Math.round(point.temperature)}°</div>`;
        } else if (activeLayer === "rain") {
          markerHtml = `<div class="flex items-center justify-center font-condensed text-[11px] font-bold h-8 w-8 bg-paper text-ink border-2 border-hairline hover:bg-canvas transition-colors duration-150">${point.rain}m</div>`;
        } else if (activeLayer === "wind") {
          markerHtml = `<div class="flex items-center justify-center font-condensed text-[11px] font-bold h-8 w-8 bg-paper text-ink border-2 border-hairline hover:bg-canvas transition-colors duration-150">${Math.round(point.windSpeed)}k</div>`;
        }
      } else {
        if (activeLayer === "temp") {
          markerHtml = `<div class="flex items-center justify-center font-sans font-bold text-xs h-8 w-8 bg-paper text-ink border border-hairline shadow-md rounded-full hover:border-ink/40 transition-all duration-200">${Math.round(point.temperature)}°</div>`;
        } else if (activeLayer === "rain") {
          markerHtml = `<div class="flex items-center justify-center font-sans font-bold text-[9px] h-8 w-8 bg-paper text-ink border border-hairline shadow-md rounded-full hover:border-ink/40 transition-all duration-200">${point.rain}mm</div>`;
        } else if (activeLayer === "wind") {
          const rotation = point.windDirection;
          markerHtml = `<div class="flex flex-col items-center justify-center font-sans font-bold text-[8px] h-8 w-8 bg-paper text-ink border border-hairline shadow-md rounded-full hover:border-ink/40 transition-all duration-200"><span class="leading-none">${Math.round(point.windSpeed)}</span><svg style="transform:rotate(${rotation}deg);width:6px;height:6px;fill:currentColor;" viewBox="0 0 24 24" class="mt-0.5 text-mid-gray"><path d="M12,2L4.5,20.29L5.21,21L12,18L18.79,21L19.5,20.29L12,2Z"/></svg></div>`;
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
        .on("click", () => { onMarkerClick(point.lat, point.lon, point.name); });

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

  // ── Control button style helper ───────────────────────────────────────────
  const btnCls = isGallery
    ? "h-10 w-10 flex items-center justify-center bg-paper border-2 border-hairline text-ink hover:bg-canvas font-bold cursor-pointer select-none"
    : "h-10 w-10 flex items-center justify-center rounded-full bg-paper/85 backdrop-blur-md border border-hairline shadow-sm text-ink hover:bg-canvas hover:text-ink/80 transition-all cursor-pointer select-none";

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
      {/* ── 2D Leaflet map (always mounted, hidden in globe mode) ── */}
      <div
        ref={mapContainerRef}
        className={`w-full h-full min-h-[400px] md:min-h-[500px] z-10 ${
          viewMode === "globe" ? "hidden" : "block"
        }`}
      />

      {/* ── 3D MapLibre Globe (mounted only when active in expanded mode) ── */}
      {viewMode === "globe" && isExpanded && (
        <div className="w-full h-full z-10 overflow-hidden rounded-[inherit]">
          <GlobeView
            lat={lat}
            lon={lon}
            theme={theme}
            onLocationClick={(cLat, cLon) => {
              if (isFinite(cLat) && isFinite(cLon)) {
                onMapClick(cLat, cLon);
              }
            }}
          />
        </div>
      )}

      {/* ── Status label ── */}
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
            ? "Globe View — Click anywhere to get weather"
            : isGallery
            ? "GRID SECTOR MAP"
            : "Sector Grid Map"}
        </span>
      </div>

      {/* ── Controls overlay (bottom-right) ── */}
      <div className="absolute bottom-6 right-6 z-20 flex flex-col gap-2">
        {/* Zoom controls — only in 2D map mode, not expanded */}
        {!isExpanded && viewMode === "map" && (
          <>
            <button onClick={() => mapRef.current?.zoomIn()}  title="Zoom In"  className={btnCls}><Plus  className="h-4 w-4" /></button>
            <button onClick={() => mapRef.current?.zoomOut()} title="Zoom Out" className={btnCls}><Minus className="h-4 w-4" /></button>
          </>
        )}

        {/* Globe / Map toggle — only in expanded mode */}
        {isExpanded && (
          <button
            onClick={() => setViewMode(v => v === "map" ? "globe" : "map")}
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
            if (!next) setViewMode("map"); // revert to map on collapse
          }}
          title={isExpanded ? "Collapse Map" : "Expand Map Fullscreen"}
          className={btnCls}
        >
          {isExpanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
}
