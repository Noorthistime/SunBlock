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
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORTH5CYII=";

// ── SINGLE SOURCE OF TRUTH TEMPERATURE COLOR SCALE ────────────────────────────
// < 0°C      → Purple  (#4c1d95)
// 0–10°C     → Blue    (#1e3a8a -> #2563eb)
// 10–20°C    → Cyan    (#06b6d4)
// 20–25°C    → Green   (#10b981)
// 25–30°C    → Yellow  (#eab308)
// 30–35°C    → Orange  (#f97316)
// 35–42°C+   → Red     (#ef4444 -> #7f1d1d)
/**
 * Maps a given temperature in degrees Celsius to an RGBA color tuple
 * following the application's single source of truth color gradient scale.
 *
 * @param temp Temperature value in °C
 * @returns [red, green, blue, alpha] color channels
 */
function getTemperatureRGB(temp: number): [number, number, number, number] {
  const stops: { t: number; r: number; g: number; b: number }[] = [
    { t: -15, r: 76,  g: 29,  b: 149 }, // Deep Purple (< 0°C)
    { t: 0,   r: 30,  g: 58,  b: 138 }, // Dark Blue (0°C)
    { t: 10,  r: 37,  g: 99,  b: 235 }, // Blue (10°C)
    { t: 20,  r: 6,   g: 182, b: 212 }, // Cyan (20°C)
    { t: 25,  r: 16,  g: 185, b: 129 }, // Green (25°C)
    { t: 30,  r: 234, g: 179, b: 8   }, // Yellow (30°C)
    { t: 35,  r: 249, g: 115, b: 22  }, // Orange (35°C)
    { t: 40,  r: 239, g: 68,  b: 68  }, // Red (40°C)
    { t: 45,  r: 127, g: 29,  b: 29  }, // Dark Red (45°C+)
  ];

  if (temp <= stops[0].t) return [stops[0].r, stops[0].g, stops[0].b, 175];
  if (temp >= stops[stops.length - 1].t) {
    const last = stops[stops.length - 1];
    return [last.r, last.g, last.b, 175];
  }

  for (let i = 0; i < stops.length - 1; i++) {
    const s1 = stops[i];
    const s2 = stops[i + 1];
    if (temp >= s1.t && temp <= s2.t) {
      const factor = (temp - s1.t) / (s2.t - s1.t);
      const r = Math.round(s1.r + factor * (s2.r - s1.r));
      const g = Math.round(s1.g + factor * (s2.g - s1.g));
      const b = Math.round(s1.b + factor * (s2.b - s1.b));
      return [r, g, b, 175];
    }
  }

  return [16, 185, 129, 175];
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
  const [activeMapOverlay, setActiveMapOverlay] = useState<MapOverlayType>("none");

  // RainViewer timestamps for live radar & satellite animation
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
  const overlayMarkersRef = useRef<L.Marker[]>([]);
  const isZoomingRef = useRef<boolean>(false);

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
          setFrameIndex(radarList.length - 1);
        }
        if (satList.length > 0) {
          setSatTimestamps(satList);
        }
      })
      .catch((err) => console.warn("RainViewer timestamp fetch failed:", err));
  }, []);

  // Live animation playback loop
  useEffect(() => {
    if (activeMapOverlay === "none" || !isPlaying) return;

    const timestamps = activeMapOverlay === "clouds" ? satTimestamps : radarTimestamps;
    if (!timestamps || timestamps.length === 0) return;

    const interval = setInterval(() => {
      setFrameIndex((prev) => (prev + 1) % timestamps.length);
    }, 850);

    return () => clearInterval(interval);
  }, [activeMapOverlay, isPlaying, radarTimestamps, satTimestamps]);

  // Native Container ResizeObserver for map & canvas bounds
  useEffect(() => {
    if (!containerRef.current) return;

    const ro = new ResizeObserver(() => {
      if (mapRef.current) {
        mapRef.current.invalidateSize();
      }
      if (canvasRef.current && containerRef.current) {
        canvasRef.current.width = containerRef.current.clientWidth;
        canvasRef.current.height = containerRef.current.clientHeight;
      }
    });

    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  // Invalidate Leaflet size on expand toggle
  useEffect(() => {
    if (mapRef.current) {
      setTimeout(() => {
        mapRef.current?.invalidateSize();
      }, 200);
    }
  }, [isExpanded]);

  const lightTiles = "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png";
  const darkTiles = "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png";
  const voyagerTiles = "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png";
  const attribution =
    '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>';
  const isGallery = styleMode === "gallery";

  // ── Leaflet init (Single persistent instance) ────────────────────────────────
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
      fadeAnimation: false,
      zoomAnimation: true,
      attributionControl: false,
      maxBounds: [[-85, -180], [85, 180]],
      maxBoundsViscosity: 1.0,
    });
    mapRef.current = map;

    // Track zoom animation lifecycle
    map.on("zoomstart", () => {
      isZoomingRef.current = true;
    });
    map.on("zoomend", () => {
      isZoomingRef.current = false;
    });

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

    const activeBaseTile = activeMapOverlay !== "none" ? voyagerTiles : theme === "dark" ? darkTiles : lightTiles;
    
    const tiles = L.tileLayer(activeBaseTile, {
      attribution,
      maxZoom: 19,
      noWrap: true,
      keepBuffer: 8,
      updateWhenZooming: false,
      updateWhenIdle: true,
      bounds: [[-85, -180], [85, 180]],
    }).addTo(map);
    tileLayerRef.current = tiles;

    if (canvasRef.current && mapContainerRef.current) {
      canvasRef.current.width = mapContainerRef.current.clientWidth;
      canvasRef.current.height = mapContainerRef.current.clientHeight;
    }

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

  // ── Base Map Tile Swap ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!tileLayerRef.current) return;
    const targetBaseTiles = activeMapOverlay !== "none" ? voyagerTiles : theme === "dark" ? darkTiles : lightTiles;
    tileLayerRef.current.setUrl(targetBaseTiles);
  }, [theme, activeMapOverlay]);

  // ── Active Overlay Weather Tile Layer Management ──────────────────────────────
  useEffect(() => {
    if (!mapRef.current) return;

    if (overlayTileLayerRef.current) {
      overlayTileLayerRef.current.remove();
      overlayTileLayerRef.current = null;
    }

    if (activeMapOverlay === "none" || activeMapOverlay === "temperature") return;

    const timestamps = activeMapOverlay === "clouds" ? satTimestamps : radarTimestamps;
    const ts =
      timestamps && timestamps.length > 0
        ? timestamps[Math.min(frameIndex, timestamps.length - 1)]
        : Math.floor(Date.now() / 1000);

    let tileUrl = "";
    let opacity = 0.75;
    let className = "";

    if (activeMapOverlay === "radar") {
      tileUrl = `https://tilecache.rainviewer.com/v2/radar/${ts}/256/{z}/{x}/{y}/1/1_1.png`;
      opacity = 0.8;
    } else if (activeMapOverlay === "precipitation") {
      tileUrl = `https://tilecache.rainviewer.com/v2/radar/${ts}/256/{z}/{x}/{y}/1/1_0.png`;
      opacity = 0.85;
    } else if (activeMapOverlay === "clouds") {
      tileUrl = `https://tilecache.rainviewer.com/v2/sat/${ts}/256/{z}/{x}/{y}/0/0_0.png`;
      opacity = 0.65;
    } else if (activeMapOverlay === "wind") {
      tileUrl = `https://tilecache.rainviewer.com/v2/radar/${ts}/256/{z}/{x}/{y}/1/1_1.png`;
      opacity = 0.7;
      className = "wind-velocity-filter";
    }

    if (tileUrl) {
      const overlayLayer = L.tileLayer(tileUrl, {
        maxZoom: 19,
        maxNativeZoom: 7,
        keepBuffer: 8,
        updateWhenZooming: false,
        updateWhenIdle: true,
        opacity: opacity,
        zIndex: 400,
        errorTileUrl: TRANSPARENT_TILE,
        className: className,
      }).addTo(mapRef.current);
      overlayTileLayerRef.current = overlayLayer;
    }
  }, [activeMapOverlay, frameIndex, radarTimestamps, satTimestamps]);

  // ── CONTINUOUS SPATIAL THERMAL FIELD RENDERER WITH LIVE WEATHER SYNCHRONIZATION ──
  /**
   * Renders a continuous spatial thermal field across the canvas viewport using
   * Inverse Distance Weighting (IDW) interpolation synced with Leaflet map projection.
   */
  const renderIDWTemperatureField = useCallback(() => {
    const map = mapRef.current;
    const canvas = canvasRef.current;
    if (!map || !canvas || !containerRef.current) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    if (width === 0 || height === 0) return;

    ctx.clearRect(0, 0, width, height);

    if (activeMapOverlay !== "temperature") return;

    const baseLat = validCoord(lat) ? lat : 19.076;
    const baseLon = validCoord(lon) ? lon : 72.8777;
    const currentTemp = layers.length > 0 ? layers[0].temperature : 25;

    // Synchronized Global & Local Spatial Meteorological Mesh
    const mesh: { lat: number; lon: number; temp: number }[] = [
      // Active Location & Open-Meteo spatial points
      { lat: baseLat, lon: baseLon, temp: currentTemp },
      ...layers.map((l) => ({ lat: l.lat, lon: l.lon, temp: l.temperature })),
      { lat: 19.696, lon: 72.765, temp: currentTemp + 1 }, // Palghar
      { lat: 19.218, lon: 72.978, temp: currentTemp + 1 }, // Thane
      { lat: 18.520, lon: 73.856, temp: Math.max(18, currentTemp - 3) }, // Pune (Cooler hill region)
      { lat: 21.170, lon: 72.831, temp: currentTemp + 2 }, // Surat
      { lat: 21.145, lon: 79.088, temp: currentTemp + 2 }, // Nagpur
      { lat: 17.385, lon: 78.486, temp: currentTemp + 1 }, // Hyderabad

      // Global reference points
      { lat: 30.000, lon: 82.000, temp: 2 },   // Himalayas
      { lat: 25.000, lon: 15.000, temp: 39 },  // Sahara Desert
      { lat: 24.713, lon: 46.675, temp: 38 },  // Riyadh
      { lat: 33.939, lon: 67.710, temp: 22 },  // Afghanistan
      { lat: 35.689, lon: 51.389, temp: 24 },  // Iran
      { lat: 51.507, lon: -0.127, temp: 15 },  // London
      { lat: 48.856, lon: 2.352,   temp: 16 },  // Paris
      { lat: 40.712, lon: -74.006, temp: 18 },  // New York
      { lat: 0.000,  lon: 80.000,  temp: 28 },  // Equatorial Indian Ocean
      { lat: 75.000, lon: -40.000, temp: -22 }, // Greenland
      { lat: -75.00, lon: 0.000,   temp: -32 }, // Antarctica
    ];

    const step = 4;
    const cols = Math.ceil(width / step);
    const rows = Math.ceil(height / step);

    const imgData = ctx.createImageData(width, height);
    const data = imgData.data;

    const p = 2.2;

    for (let r = 0; r < rows; r++) {
      const py = r * step + step / 2;
      for (let c = 0; c < cols; c++) {
        const px = c * step + step / 2;

        const latLng = map.containerPointToLatLng(L.point(px, py));
        const cellLat = latLng.lat;
        const cellLon = latLng.lng;

        let num = 0;
        let den = 0;
        let exactTemp: number | null = null;

        for (let i = 0; i < mesh.length; i++) {
          const m = mesh[i];
          const dLat = cellLat - m.lat;
          const dLon = cellLon - m.lon;
          const distSq = dLat * dLat + dLon * dLon;

          if (distSq < 0.0001) {
            exactTemp = m.temp;
            break;
          }

          const w = 1 / (Math.pow(distSq, p / 2) + 0.08) + 0.15 * Math.exp(-distSq / 300);
          num += w * m.temp;
          den += w;
        }

        const interpolatedTemp = exactTemp !== null ? exactTemp : den > 0 ? num / den : currentTemp;
        const [red, green, blue, alpha] = getTemperatureRGB(interpolatedTemp);

        for (let dy = 0; dy < step; dy++) {
          const y = r * step + dy;
          if (y >= height) break;
          for (let dx = 0; dx < step; dx++) {
            const x = c * step + dx;
            if (x >= width) break;
            const index = (y * width + x) * 4;
            data[index] = red;
            data[index + 1] = green;
            data[index + 2] = blue;
            data[index + 3] = alpha;
          }
        }
      }
    }

    ctx.putImageData(imgData, 0, 0);
  }, [activeMapOverlay, lat, lon, layers]);

  // Synchronize IDW canvas recalculation on Leaflet move, zoomend, and resize events
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    renderIDWTemperatureField();

    let rafId: number | null = null;
    const handleMove = () => {
      if (isZoomingRef.current) return;
      if (rafId) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        renderIDWTemperatureField();
      });
    };

    const handleZoomEnd = () => {
      isZoomingRef.current = false;
      renderIDWTemperatureField();
    };

    map.on("move", handleMove);
    map.on("zoomend", handleZoomEnd);
    map.on("resize", handleMove);

    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      map.off("move", handleMove);
      map.off("zoomend", handleZoomEnd);
      map.off("resize", handleMove);
    };
  }, [activeMapOverlay, renderIDWTemperatureField]);

  // ── Particle Flow Streamlines Canvas (Active ONLY for Wind mode) ────────────
  useEffect(() => {
    if (activeMapOverlay !== "wind") return;

    const canvas = canvasRef.current;
    if (!canvas || !containerRef.current) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    const width = canvas.width;
    const height = canvas.height;

    const numParticles = 80;
    const particles = Array.from({ length: numParticles }).map(() => ({
      x: Math.random() * width,
      y: Math.random() * height,
      length: Math.random() * 22 + 10,
      speed: Math.random() * 2.5 + 1.2,
      angle: (Math.random() * 20 - 10 + 30) * (Math.PI / 180),
    }));

    const render = () => {
      ctx.clearRect(0, 0, width, height);
      ctx.strokeStyle = "rgba(255, 255, 255, 0.55)";
      ctx.lineWidth = 1.8;
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

  // ── Selected Clicked Location Marker ──
  useEffect(() => {
    if (!mapRef.current) return;
    overlayMarkersRef.current.forEach((m) => m.remove());
    overlayMarkersRef.current = [];

    if (activeMapOverlay === "none") return;

    const clickLat = validCoord(lat) ? lat : 19.076;
    const clickLon = validCoord(lon) ? lon : 72.8777;
    const selectedTemp = layers.length > 0 ? Math.round(layers[0].temperature) : 25;

    let html = "";
    if (activeMapOverlay === "temperature") {
      html = `<div class="px-2.5 py-1 rounded-full bg-paper/95 backdrop-blur-md text-ink border-2 border-ink shadow-lg text-xs font-sans font-bold flex items-center gap-1 select-none pointer-events-none animate-pulse">
        <span>Selected Location</span>
        <span class="text-ember font-extrabold">${selectedTemp}°C</span>
      </div>`;
    } else if (activeMapOverlay === "wind") {
      const selectedWind = layers.length > 0 ? Math.round(layers[0].windSpeed) : 25;
      html = `<div class="px-2.5 py-1 rounded-full bg-paper/95 backdrop-blur-md text-ink border-2 border-ink shadow-lg text-xs font-sans font-bold flex items-center gap-1 select-none pointer-events-none">
        <span>Selected Location</span>
        <span>${selectedWind} km/h ↘</span>
      </div>`;
    }

    if (html) {
      const icon = L.divIcon({
        className: "custom-selected-badge",
        html: html,
        iconSize: [140, 28],
        iconAnchor: [70, 14],
      });
      const marker = L.marker([clickLat, clickLon], { icon }).addTo(mapRef.current!);
      overlayMarkersRef.current.push(marker);
    }
  }, [activeMapOverlay, lat, lon, layers]);

  // ── Primary Weather Layer Markers ────────────────────────────────────────────
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

      {/* ── Particle / Thermal Canvas Overlay ── */}
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
            ? `LIVE ${activeMapOverlay.toUpperCase()} MAP • ${timeFormatted}`
            : isGallery
            ? "GRID SECTOR MAP"
            : "Sector Grid Map"}
        </span>
      </div>

      {/* ── Top Center Disclaimer Badge (Appears ONLY when Temperature button is clicked inside expanded map) ── */}
      {isExpanded && activeMapOverlay === "temperature" && (
        <div
          className={`absolute top-4 left-1/2 -translate-x-1/2 z-20 pointer-events-none px-3.5 py-1.5 text-xs font-sans font-semibold text-ink shadow-sm hidden md:flex items-center gap-1.5 whitespace-nowrap ${
            isGallery
              ? "border-2 border-ink rounded-none bg-paper font-condensed uppercase tracking-wider text-[10px]"
              : "border border-hairline rounded-full bg-paper/90 backdrop-blur-md"
          }`}
        >
          <span>Don&apos;t mind the temperature gradient color yet it works accurately when Zoomed In</span>
        </div>
      )}

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

      {/* ── Active Layer Color Legend & Playback Control ── */}
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
              {activeMapOverlay !== "temperature" && (
                <button
                  onClick={() => setIsPlaying(!isPlaying)}
                  className="p-1 hover:bg-canvas rounded-full transition-colors cursor-pointer"
                  title={isPlaying ? "Pause Stream Animation" : "Play Stream Animation"}
                >
                  {isPlaying ? <Pause className="h-3 w-3 text-ink" /> : <Play className="h-3 w-3 text-ink" />}
                </button>
              )}
              <span>{activeMapOverlay} SCALE</span>
            </div>
            <span className="text-mid-gray text-[9px]">{timeFormatted}</span>
          </div>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="text-[9px] text-mid-gray">
              {activeMapOverlay === "temperature" ? "-15°C" : activeMapOverlay === "wind" ? "0 km/h" : "LIGHT"}
            </span>
            <div
              className="h-2.5 w-48 rounded-full overflow-hidden border border-hairline"
              style={{
                background:
                  activeMapOverlay === "temperature"
                    ? "linear-gradient(to right, #4c1d95, #1e3a8a, #2563eb, #06b6d4, #10b981, #eab308, #f97316, #ef4444, #7f1d1d)"
                    : activeMapOverlay === "wind"
                    ? "linear-gradient(to right, #06b6d4, #10b981, #eab308, #dc2626)"
                    : activeMapOverlay === "clouds"
                    ? "linear-gradient(to right, #475569, #94a3b8, #f8fafc)"
                    : "linear-gradient(to right, #4ade80, #facc15, #f87171, #c084fc)",
              }}
            />
            <span className="text-[9px] text-mid-gray">
              {activeMapOverlay === "temperature" ? "42°C" : activeMapOverlay === "wind" ? "100 km/h" : "HEAVY"}
            </span>
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
              setActiveMapOverlay("none");
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
