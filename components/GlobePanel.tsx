"use client";

import { useState, useEffect, useRef } from "react";
import DeckGL from "@deck.gl/react";
import { _GlobeView as GlobeView } from "@deck.gl/core";
import { TileLayer } from "@deck.gl/geo-layers";
import { BitmapLayer, ScatterplotLayer } from "@deck.gl/layers";


function validCoord(v: number) {
  return typeof v === "number" && isFinite(v) && !isNaN(v);
}

interface GlobePanelProps {
  lat: number;
  lon: number;
  onLocationClick: (lat: number, lon: number) => void;
}

export default function GlobePanel({ lat, lon, onLocationClick }: GlobePanelProps) {
  const onClickRef = useRef(onLocationClick);
  useEffect(() => { onClickRef.current = onLocationClick; }, [onLocationClick]);

  const initLat = validCoord(lat) ? lat : 19.076;
  const initLon = validCoord(lon) ? lon : 72.8777;

  const [viewState, setViewState] = useState({
    longitude: initLon,
    latitude: initLat,
    zoom: 1.5,
    bearing: 0,
    pitch: 0,
  });

  // When weather location changes, smoothly pan globe camera there
  useEffect(() => {
    if (!validCoord(lat) || !validCoord(lon)) return;
    setViewState(prev => ({
      ...prev,
      longitude: lon,
      latitude: lat,
      // Zoom to at least city level after first location pick
      zoom: prev.zoom < 3 ? prev.zoom : prev.zoom,
    }));
  }, [lat, lon]);

  // ── CartoDB Voyager tiles — free public CDN, no API key, Vercel-safe ─────────
  const tileLayer = new TileLayer({
    id: "base-tiles",
    data: [
      "https://a.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png",
      "https://b.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png",
      "https://c.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png",
      "https://d.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png",
    ],
    minZoom: 0,
    maxZoom: 19,
    tileSize: 256,
    renderSubLayers: (props: any) => {
      const { west, south, east, north } = props.tile.bbox;
      return new BitmapLayer(props, {
        data: undefined,
        image: props.data,
        bounds: [west, south, east, north],
      });
    },
  });

  // ── Selected location — red dot + outer ring ──────────────────────────────────
  const hasPin = validCoord(lat) && validCoord(lon);
  const pinData = hasPin ? [{ coords: [lon, lat] }] : [];

  const pinFill = new ScatterplotLayer({
    id: "pin-fill",
    data: pinData,
    getPosition: (d: any) => d.coords,
    getFillColor: [239, 68, 68, 230],
    getRadius: 35000,
    radiusUnits: "meters",
    pickable: false,
  });

  const pinRing = new ScatterplotLayer({
    id: "pin-ring",
    data: pinData,
    getPosition: (d: any) => d.coords,
    getFillColor: [0, 0, 0, 0],
    getLineColor: [239, 68, 68, 180],
    lineWidthMinPixels: 2,
    stroked: true,
    filled: false,
    getRadius: 75000,
    radiusUnits: "meters",
    pickable: false,
  });

  return (
    <div
      className="relative w-full h-full overflow-hidden"
      style={{ cursor: "crosshair", background: "#000814" }}
    >
      <DeckGL
        // GlobeView: renders the earth as a true 3D sphere with real tiles
        views={new GlobeView({ resolution: 10 })}
        viewState={viewState}
        controller={true}  // drag = rotate/pan, scroll = zoom, dblclick = zoom in
        onViewStateChange={({ viewState: vs }: any) => setViewState(vs)}
        layers={[tileLayer, pinRing, pinFill]}
        onClick={(info: any) => {
          // info.coordinate is [longitude, latitude] when clicking the globe surface
          // It is undefined/null when clicking the empty space around the globe
          if (!info.coordinate) return;
          const [clickLon, clickLat] = info.coordinate;
          if (validCoord(clickLat) && validCoord(clickLon)) {
            onClickRef.current(clickLat, clickLon);
          }
        }}
        // Make canvas fill the container perfectly
        style={{ position: "absolute", inset: "0" }}
      />

      {/* Atmosphere glow — CSS ring around the globe sphere edge */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: "50%",
          pointerEvents: "none",
          boxShadow: [
            "inset 0 0 80px 30px rgba(100, 170, 255, 0.22)",
            "0 0 60px 20px rgba(80, 150, 255, 0.14)",
          ].join(", "),
        }}
      />

      {/* Instruction hint */}
      <div
        style={{
          position: "absolute",
          bottom: 20,
          left: "50%",
          transform: "translateX(-50%)",
          pointerEvents: "none",
          background: "rgba(0,0,0,0.55)",
          backdropFilter: "blur(8px)",
          borderRadius: 99,
          padding: "4px 14px",
          fontSize: 10,
          color: "rgba(255,255,255,0.65)",
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          whiteSpace: "nowrap",
        }}
      >
        Drag to rotate · Scroll to zoom · Click to get weather
      </div>
    </div>
  );
}
