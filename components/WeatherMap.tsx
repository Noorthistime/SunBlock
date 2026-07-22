"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import L from "leaflet";
import { WeatherLayerPoint, LayerType } from "../types/weather";
import { StyleModeType, ThemeType } from "../hooks/useWeather";
import {
  Plus,
  Minus,
  Maximize2,
  Minimize2,
  Thermometer,
  CloudRain,
  Radio,
  Wind,
  Cloud,
  Play,
  Pause,
} from "lucide-react";

export type MapOverlayType = "none" | "temperature" | "precipitation" | "radar" | "wind" | "clouds";

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

// 1x1 transparent PNG data URI to replace any missing/unsupported tiles cleanly
const TRANSPARENT_TILE =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";

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
  const [activeMapOverlay, setActiveMapOverlay] = useState<MapOverlayType>("none");

  // RainViewer timestamps for real-time radar & satellite animation
  const [radarTimestamps, setRadarTimestamps] = useState<number[]>([]);
  const [satTimestamps, setSatTimestamps] = useState<number[]>([]);
  const [frameIndex, setFrameIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);

  const containerRef = useRef<HTMLDivElement>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const overlayTileLayerRef = useRef<L.TileLayer | null>(null);
  const markersRef = useRef<L.Marker[]>([]);

  const onMapClickRef = useRef(onMapClick);
  useEffect(() => {
    onMapClickRef.current = onMapClick;
  }, [onMapClick]);

  // Fetch RainViewer timestamp list for live radar/satellite timeline animation
  useEffect(() => {
    fetch("https://api.rainviewer.com/public/weather-maps.json")
      .then((res) => res.json())
      .then((data) => {
        const radarList: number[] = [];
        if (data?.radar?.past?.length) {
          data.radar.past.forEach((item: { time: number }) => radarList.push(item.time));
        }
        if (data?.radar?.nowcast?.length) {
          data.radar.nowcast.forEach((item: { time: number }) => radarList.push(item.time));
        }

        const satList: number[] = [];
        if (data?.sat?.past?.length) {
          data.sat.past.forEach((item: { time: number }) => satList.push(item.time));
        }

        if (radarList.length > 0) {
          setRadarTimestamps(radarList);
          setFrameIndex(radarList.length - 1); // Start at latest
        }
        if (satList.length > 0) {
          setSatTimestamps(satList);
        }
      })
      .catch((err) => console.warn("RainViewer timestamp fetch failed:", err));
  }, []);

  // Live animation playback loop (advances frameIndex every 800ms)
  useEffect(() => {
    if (activeMapOverlay === "none" || !isPlaying) return;

    const timestamps = activeMapOverlay === "clouds" ? satTimestamps : radarTimestamps;
    if (!timestamps || timestamps.length === 0) return;

    const interval = setInterval(() => {
      setFrameIndex((prev) => (prev + 1) % timestamps.length);
    }, 850);

    return () => clearInterval(interval);
  }, [activeMapOverlay, isPlaying, radarTimestamps, satTimestamps]);

  // Invalidate Leaflet size on expand toggle
  useEffect(() => {
    if (mapRef.current) {
      setTimeout(() => {
        mapRef.current?.invalidateSize();
      }, 300);
    }
  }, [isExpanded]);

  const lightTiles = "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png";
  const darkTiles = "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png";
  const attribution =
    '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>';
  const isGallery = styleMode === "gallery";

  // ── Leaflet init ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapRef.current) {
      mapRef.current.remove();
      mapRef.current = null;
    }

    const initLat = validCoord(lat) ? lat : 19.076;
    const initLon = validCoord(lon) ? lon : 72.8777;

    const map = L.map(mapContainerRef.current, {
      center: [initLat, initLon],
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
      if (clickTimeout) {
        clearTimeout(clickTimeout);
        clickTimeout = null;
      }
    });

    const tiles = L.tileLayer(theme === "dark" ? darkTiles : lightTiles, {
      attribution,
      maxZoom: 19,
      noWrap: true,
      bounds: [[-85, -180], [85, 180]],
    }).addTo(map);
    tileLayerRef.current = tiles;

    setTimeout(() => {
      map.invalidateSize();
    }, 150);

    return () => {
      if (clickTimeout) clearTimeout(clickTimeout);
      map.off();
      map.remove();
      mapRef.current = null;
      tileLayerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Fly to coord ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!mapRef.current) return;
    if (!validCoord(lat) || !validCoord(lon)) return;
    try {
      const center = L.latLng(lat, lon);
      const bounds = mapRef.current.getBounds();
      if (bounds && !bounds.contains(center)) {
        mapRef.current.flyTo(center, mapRef.current.getZoom(), { animate: true, duration: 1.5 });
      }
    } catch (_) {
      /* swallow rare Leaflet edge-case errors */
    }
  }, [lat, lon]);

  // ── Tile theme swap ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!tileLayerRef.current) return;
    tileLayerRef.current.setUrl(theme === "dark" ? darkTiles : lightTiles);
  }, [theme]);

  // ── Active Overlay Weather Layer Management ──────────────────────────────────
  useEffect(() => {
    if (!mapRef.current) return;

    // Clear previous overlay
    if (overlayTileLayerRef.current) {
      overlayTileLayerRef.current.remove();
      overlayTileLayerRef.current = null;
    }

    if (activeMapOverlay === "none") return;

    const timestamps = activeMapOverlay === "clouds" ? satTimestamps : radarTimestamps;
    const ts =
      timestamps && timestamps.length > 0
        ? timestamps[Math.min(frameIndex, timestamps.length - 1)]
        : Math.floor(Date.now() / 1000);

    let tileUrl = "";
    let opacity = 0.75;
    let className = "";

    // Officially supported RainViewer tile schemes:
    // /radar/{ts}/256/{z}/{x}/{y}/1/1_1.png (Smooth radar)
    // /radar/{ts}/256/{z}/{x}/{y}/1/1_0.png (Precipitation)
    // /sat/{ts}/256/{z}/{x}/{y}/0/0_0.png (Infrared Satellite Cloud)
    if (activeMapOverlay === "radar") {
      tileUrl = `https://tilecache.rainviewer.com/v2/radar/${ts}/256/{z}/{x}/{y}/1/1_1.png`;
    } else if (activeMapOverlay === "precipitation") {
      tileUrl = `https://tilecache.rainviewer.com/v2/radar/${ts}/256/{z}/{x}/{y}/1/1_0.png`;
    } else if (activeMapOverlay === "clouds") {
      tileUrl = `https://tilecache.rainviewer.com/v2/sat/${ts}/256/{z}/{x}/{y}/0/0_0.png`;
      opacity = 0.65;
    } else if (activeMapOverlay === "temperature") {
      tileUrl = `https://tilecache.rainviewer.com/v2/radar/${ts}/256/{z}/{x}/{y}/1/1_1.png`;
      opacity = 0.75;
      className = "temperature-hue-filter";
    } else if (activeMapOverlay === "wind") {
      tileUrl = `https://tilecache.rainviewer.com/v2/radar/${ts}/256/{z}/{x}/{y}/1/1_1.png`;
      opacity = 0.75;
      className = "wind-hue-filter";
    }

    if (tileUrl) {
      const overlayLayer = L.tileLayer(tileUrl, {
        maxZoom: 19,
        maxNativeZoom: 7, // CRITICAL: Prevents "Zoom Level Not Supported" tiles at deep zoom levels!
        opacity: opacity,
        zIndex: 400,
        errorTileUrl: TRANSPARENT_TILE, // Fallback transparent 1x1 image so error boxes never appear!
        className: className,
      }).addTo(mapRef.current);
      overlayTileLayerRef.current = overlayLayer;
    }
  }, [activeMapOverlay, frameIndex, radarTimestamps, satTimestamps]);

  // ── Real-Time Wind Stream Particles Canvas (Active when Wind or Temperature selected) ──
  useEffect(() => {
    if (activeMapOverlay !== "wind" && activeMapOverlay !== "temperature") {
      if (canvasRef.current) {
        const ctx = canvasRef.current.getContext("2d");
        if (ctx) ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      }
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas || !containerRef.current) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    const width = (canvas.width = containerRef.current.clientWidth);
    const height = (canvas.height = containerRef.current.clientHeight);

    // Create moving particle streams
    const numParticles = 65;
    const particles = Array.from({ length: numParticles }).map(() => ({
      x: Math.random() * width,
      y: Math.random() * height,
      length: Math.random() * 18 + 8,
      speed: Math.random() * 2 + 1,
      angle: (Math.random() * 30 - 15) * (Math.PI / 180), // Slight angle
    }));

    const render = () => {
      ctx.clearRect(0, 0, width, height);
      ctx.strokeStyle =
        activeMapOverlay === "temperature"
          ? "rgba(251, 146, 60, 0.45)"
          : "rgba(56, 189, 248, 0.55)";
      ctx.lineWidth = 1.5;
      ctx.lineCap = "round";

      particles.forEach((p) => {
        p.x += Math.cos(p.angle) * p.speed * 1.5;
        p.y += Math.sin(p.angle) * p.speed;

        if (p.x > width) p.x = 0;
        if (p.y > height) p.y = Math.random() * height;

        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x - Math.cos(p.angle) * p.length, p.y - Math.sin(p.angle) * p.length);
        ctx.stroke();
      });

      animId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animId);
    };
  }, [activeMapOverlay]);

  // ── Weather layer markers ────────────────────────────────────────────────────
  useEffect(() => {
    if (!mapRef.current) return;
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    layers.forEach((point) => {
      let html = "";
      if (isGallery) {
        if (activeLayer === "temp")
          html = `<div class="flex items-center justify-center font-condensed text-[11px] font-bold h-8 w-8 bg-paper text-ink border-2 border-hairline hover:bg-canvas">${Math.round(
            point.temperature
          )}°</div>`;
        else if (activeLayer === "rain")
          html = `<div class="flex items-center justify-center font-condensed text-[11px] font-bold h-8 w-8 bg-paper text-ink border-2 border-hairline hover:bg-canvas">${point.rain}m</div>`;
        else if (activeLayer === "wind")
          html = `<div class="flex items-center justify-center font-condensed text-[11px] font-bold h-8 w-8 bg-paper text-ink border-2 border-hairline hover:bg-canvas">${Math.round(
            point.windSpeed
          )}k</div>`;
      } else {
        if (activeLayer === "temp")
          html = `<div class="flex items-center justify-center font-sans font-bold text-xs h-8 w-8 bg-paper text-ink border border-hairline shadow-md rounded-full">${Math.round(
            point.temperature
          )}°</div>`;
        else if (activeLayer === "rain")
          html = `<div class="flex items-center justify-center font-sans font-bold text-[9px] h-8 w-8 bg-paper text-ink border border-hairline shadow-md rounded-full">${point.rain}mm</div>`;
        else if (activeLayer === "wind") {
          const r = point.windDirection;
          html = `<div class="flex flex-col items-center justify-center font-sans font-bold text-[8px] h-8 w-8 bg-paper text-ink border border-hairline shadow-md rounded-full"><span>${Math.round(
            point.windSpeed
          )}</span><svg style="transform:rotate(${r}deg);width:6px;height:6px;fill:currentColor" viewBox="0 0 24 24"><path d="M12,2L4.5,20.29L5.21,21L12,18L18.79,21L19.5,20.29Z"/></svg></div>`;
        }
      }

      if (!html) return;
      const icon = L.divIcon({ className: "custom-mono-icon", html, iconSize: [36, 36], iconAnchor: [18, 18] });
      const marker = L.marker([point.lat, point.lon], { icon })
        .addTo(mapRef.current!)
        .on("click", () => onMarkerClick(point.lat, point.lon, point.name));
      marker.bindTooltip(
        `<div class="p-1 font-sans text-xs bg-paper text-ink"><strong>${point.name}</strong><br/>Temp: ${point.temperature}°C<br/>Rain: ${point.rain}mm<br/>Wind: ${Math.round(
          point.windSpeed
        )}km/h</div>`,
        { direction: "top", offset: [0, -10] }
      );
      markersRef.current.push(marker);
    });
  }, [layers, activeLayer, isGallery, onMarkerClick]);

  // Toggle single active overlay button (clicking twice resets to "none")
  const toggleMapOverlay = (layer: MapOverlayType) => {
    setActiveMapOverlay((prev) => {
      const next = prev === layer ? "none" : layer;
      if (next !== "none") {
        const timestamps = next === "clouds" ? satTimestamps : radarTimestamps;
        if (timestamps.length > 0) setFrameIndex(timestamps.length - 1);
        setIsPlaying(true);
      }
      return next;
    });
  };

  const btnCls = isGallery
    ? "h-10 w-10 flex items-center justify-center bg-paper border-2 border-hairline text-ink hover:bg-canvas font-bold cursor-pointer select-none"
    : "h-10 w-10 flex items-center justify-center rounded-full bg-paper/85 backdrop-blur-md border border-hairline shadow-sm text-ink hover:bg-canvas transition-all cursor-pointer select-none";

  const layerButtons: { id: MapOverlayType; label: string; icon: React.ReactNode }[] = [
    { id: "temperature", label: "Temperature", icon: <Thermometer className="h-3.5 w-3.5" /> },
    { id: "precipitation", label: "Precipitation", icon: <CloudRain className="h-3.5 w-3.5" /> },
    { id: "radar", label: "Radar", icon: <Radio className="h-3.5 w-3.5" /> },
    { id: "wind", label: "Wind", icon: <Wind className="h-3.5 w-3.5" /> },
    { id: "clouds", label: "Cloud", icon: <Cloud className="h-3.5 w-3.5" /> },
  ];

  // Current timestamp string formatting
  const timestamps = activeMapOverlay === "clouds" ? satTimestamps : radarTimestamps;
  const currentTs =
    timestamps && timestamps.length > 0
      ? timestamps[Math.min(frameIndex, timestamps.length - 1)]
      : null;
  const timeFormatted = currentTs
    ? new Date(currentTs * 1000).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : "LIVE";

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
      <div ref={mapContainerRef} className="w-full h-full min-h-[400px] md:min-h-[500px] z-10" />

      {/* ── Particle Animation Canvas Layer ── */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 z-15 pointer-events-none w-full h-full"
      />

      {/* ── Status badge ── */}
      <div
        className={`absolute top-4 left-4 z-20 pointer-events-none px-3 py-1 text-[10px] tracking-wider uppercase font-bold flex items-center gap-1.5 ${
          isGallery
            ? "border-2 border-ink rounded-none font-condensed tracking-[0.25em] bg-paper"
            : "border border-hairline shadow-sm rounded-full bg-paper/85 backdrop-blur-md"
        }`}
      >
        <span className="h-1.5 w-1.5 rounded-full bg-ink animate-pulse" />
        <span>
          {activeMapOverlay !== "none"
            ? `LIVE ${activeMapOverlay.toUpperCase()} STREAM • ${timeFormatted}`
            : isGallery
            ? "GRID SECTOR MAP"
            : "Sector Grid Map"}
        </span>
      </div>

      {/* ── Weather Overlay Selector Toolbar (Visible only in Expanded Mode) ── */}
      {isExpanded && (
        <div className="absolute top-4 right-4 z-20 flex items-center gap-1.5 overflow-x-auto max-w-[calc(100%-160px)] p-1">
          {layerButtons.map((btn) => {
            const isActive = activeMapOverlay === btn.id;
            return (
              <button
                key={btn.id}
                onClick={() => toggleMapOverlay(btn.id)}
                title={`Toggle ${btn.label} Layer (click again to turn off)`}
                className={
                  isGallery
                    ? `px-3 py-1.5 flex items-center gap-1.5 font-condensed text-xs uppercase font-bold transition-colors cursor-pointer select-none ${
                        isActive
                          ? "bg-ink text-paper border-2 border-ink"
                          : "bg-paper text-ink border-2 border-hairline hover:bg-canvas"
                      }`
                    : `px-3 py-1.5 flex items-center gap-1.5 font-sans text-xs font-semibold rounded-full backdrop-blur-md transition-all cursor-pointer select-none ${
                        isActive
                          ? "bg-ink text-paper shadow-md"
                          : "bg-paper/85 text-ink border border-hairline shadow-sm hover:bg-canvas"
                      }`
                }
              >
                {btn.icon}
                <span>{btn.label}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* ── Active Layer Color Legend & Playback Bar (Visible when an overlay is active in Expanded Mode) ── */}
      {isExpanded && activeMapOverlay !== "none" && (
        <div
          className={`absolute bottom-6 left-6 z-20 px-3.5 py-2.5 flex flex-col gap-1.5 text-[10px] font-bold uppercase tracking-wider ${
            isGallery
              ? "bg-paper border-2 border-ink text-ink font-condensed tracking-[0.15em]"
              : "bg-paper/90 backdrop-blur-md border border-hairline text-ink rounded-2xl shadow-md"
          }`}
        >
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsPlaying(!isPlaying)}
                className="p-1 hover:bg-canvas rounded-full transition-colors cursor-pointer"
                title={isPlaying ? "Pause Stream Animation" : "Play Stream Animation"}
              >
                {isPlaying ? <Pause className="h-3 w-3 text-ink" /> : <Play className="h-3 w-3 text-ink" />}
              </button>
              <span>{activeMapOverlay} STREAM</span>
            </div>
            <span className="text-mid-gray text-[9px]">{timeFormatted}</span>
          </div>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="text-[9px] text-mid-gray">MIN</span>
            <div
              className="h-2 w-40 rounded-full overflow-hidden border border-hairline"
              style={{
                background:
                  activeMapOverlay === "temperature"
                    ? "linear-gradient(to right, #3b82f6, #10b981, #f59e0b, #ef4444)"
                    : activeMapOverlay === "wind"
                    ? "linear-gradient(to right, #0284c7, #10b981, #eab308, #dc2626)"
                    : activeMapOverlay === "clouds"
                    ? "linear-gradient(to right, #475569, #94a3b8, #f8fafc)"
                    : "linear-gradient(to right, #22c55e, #eab308, #ef4444, #a855f7)",
              }}
            />
            <span className="text-[9px] text-mid-gray">MAX</span>
          </div>
        </div>
      )}

      {/* ── Controls ── */}
      <div className="absolute bottom-6 right-6 z-20 flex flex-col gap-2">
        {/* Zoom — only in non-expanded map mode */}
        {!isExpanded && (
          <>
            <button onClick={() => mapRef.current?.zoomIn()} title="Zoom In" className={btnCls}>
              <Plus className="h-4 w-4" />
            </button>
            <button onClick={() => mapRef.current?.zoomOut()} title="Zoom Out" className={btnCls}>
              <Minus className="h-4 w-4" />
            </button>
          </>
        )}

        {/* Expand / Collapse */}
        <button
          onClick={() => {
            const next = !isExpanded;
            setIsExpanded(next);
            if (!next) {
              setActiveMapOverlay("none"); // Reset layer on collapse
            }
          }}
          title={isExpanded ? "Collapse Map" : "Expand Fullscreen"}
          className={btnCls}
        >
          {isExpanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
}
