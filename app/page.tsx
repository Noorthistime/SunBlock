"use client";

import { useWeather } from "../hooks/useWeather";
import Header from "../components/Header";
import WeatherCard from "../components/WeatherCard";
import MapWrapper from "../components/MapWrapper";
import ForecastOverlay from "../components/ForecastOverlay";
import DottedProgress from "../components/DottedProgress";
import { getWeatherDetails } from "../utils/weatherCodes";
import { AlertTriangle, RefreshCw, Droplets, Wind } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function Dashboard() {
  const {
    currentLocation,
    setCurrentLocation,
    weatherData,
    isLoading,
    error,
    fetchWeather,
    searchQuery,
    setSearchQuery,
    searchResults,
    isSearching,
    styleMode,
    changeStyleMode,
    theme,
    toggleTheme,
    activeLayer,
    setActiveLayer,
    isOffline,
    getUserLocation,
  } = useWeather();

  const isGallery = styleMode === "gallery";

  // Handler for grid weather marker clicks on the Leaflet map
  const handleMarkerClick = (lat: number, lon: number, gridName: string) => {
    setCurrentLocation({
      name: `${gridName} (${lat.toFixed(2)}, ${lon.toFixed(2)})`,
      lat,
      lon,
    });
  };

  // Handler for custom coordinate clicks on the map itself
  const handleMapClick = async (lat: number, lon: number) => {
    // Set immediate loading coordinate text to ensure immediate feedback
    const coordName = `${lat.toFixed(3)}, ${lon.toFixed(3)}`;
    setCurrentLocation({
      name: `Position (${coordName})`,
      lat,
      lon,
    });

    // Run background reverse geocoding to resolve a friendly name via Nominatim
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}`,
        {
          headers: {
            "User-Agent": "SunBlockWeatherApp/1.0"
          }
        }
      );
      if (res.ok) {
        const data = await res.json();
        const address = data.address;
        if (address) {
          const city = address.city || address.town || address.village || address.suburb || address.county || "";
          const country = address.country || "";
          
          let friendlyName = "";
          if (city && country) {
            friendlyName = `${city}, ${country}`;
          } else if (data.display_name) {
            friendlyName = data.display_name.split(",").slice(0, 2).join(",").trim();
          } else {
            friendlyName = data.name || coordName;
          }
          
          setCurrentLocation({
            name: friendlyName,
            lat,
            lon,
          });
        }
      }
    } catch (err) {
      console.error("Reverse geocoding lookup failed:", err);
    }
  };

  // UV description helper
  const getUVDescription = (uv: number) => {
    if (uv <= 2) return "Low";
    if (uv <= 5) return "Moderate";
    if (uv <= 7) return "High";
    return "Very High";
  };

  // Apple Swatch color helper depending on weather code and theme
  const getAppleSwatch = (code: number, isDark: boolean) => {
    // Clear / Sunny (0, 1)
    if (code === 0 || code === 1) {
      return isDark ? "bg-[#2c1d0b] text-[#ff9f0a]" : "bg-[#fcf5e8] text-[#b64400]";
    }
    // Rainy / Stormy
    if ([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82, 95, 96, 99].includes(code)) {
      return isDark ? "bg-[#0a1b2d] text-[#0a84ff]" : "bg-[#f4f8fb] text-[#0066cc]";
    }
    // Muted / Cloudy / Wind / Snowy
    return isDark ? "bg-[#1c1c1e] text-[#d1d1d6]" : "bg-[#f5f5f7] text-[#474747]";
  };

  // Weather Sidebar Loading Skeleton
  const renderSidebarSkeleton = () => (
    <div className="flex flex-col gap-6 w-full">
      {/* Weather card skeleton */}
      <div className={`mono-card p-6 md:p-8 bg-paper animate-pulse ${isGallery ? "border-2 rounded-none" : "border rounded-[24px]"}`}>
        <div className="h-4 w-28 bg-canvas rounded-full mb-3" />
        <div className="h-8 w-48 bg-canvas rounded-lg mb-2" />
        <div className="h-4 w-32 bg-canvas rounded-full mb-8" />
        
        <div className="flex justify-between items-center mb-10">
          <div>
            <div className="h-16 w-28 bg-canvas rounded-2xl mb-2" />
            <div className="h-4 w-20 bg-canvas rounded-full" />
          </div>
          <div className="h-16 w-16 bg-canvas border border-hairline rounded-xl" />
        </div>

        <div className="grid grid-cols-2 gap-3 mb-8">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className={`h-14 bg-canvas/30 border border-hairline/60 ${isGallery ? "rounded-none" : "rounded-[18px]"}`} />
          ))}
        </div>

        <div className="border-t border-hairline pt-6">
          <div className="h-4 w-24 bg-canvas rounded-full mb-4" />
          <div className="flex flex-col gap-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className={`h-10 bg-canvas/30 border border-hairline/60 ${isGallery ? "rounded-none" : "rounded-[18px]"}`} />
            ))}
          </div>
        </div>
      </div>

      {/* Forecast list skeleton */}
      <div className="flex flex-col gap-2.5 animate-pulse">
        {Array.from({ length: 5 }).map((_, i) => (
          <div 
            key={i} 
            className={`h-16 bg-canvas/30 border border-hairline ${
              isGallery ? "rounded-none border-2" : "rounded-2xl"
            }`} 
          />
        ))}
      </div>
    </div>
  );

  // --- APPLE NEO MODE LAYOUT ---
  if (styleMode === "apple") {
    const current = weatherData?.current;
    const weatherDetails = current ? getWeatherDetails(current.weatherCode) : null;
    
    // Split coordinate names for display
    const cityTitle = currentLocation.name.split(",")[0].toUpperCase();
    const cityCountry = currentLocation.name.split(",").slice(1).join(",").trim().toUpperCase();

    return (
      <div className="min-h-screen flex flex-col pb-0 transition-colors duration-300 bg-[#ffffff] dark:bg-[#000000] text-[#1d1d1f] dark:text-[#f5f5f7] selection:bg-[#0071e3]/20">
        
        {/* Sticky Header */}
        <Header
          styleMode={styleMode}
          changeStyleMode={changeStyleMode}
          theme={theme}
          toggleTheme={toggleTheme}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          searchResults={searchResults}
          isSearching={isSearching}
          setCurrentLocation={setCurrentLocation}
          getUserLocation={getUserLocation}
        />

        {/* Apple Neo Main Stack */}
        <main className="w-full">
          
          {/* Offline/Error banners inside page wrapper */}
          <div className="w-full px-4 md:px-6 lg:px-12 mt-6">
            <AnimatePresence>
              {isOffline && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="p-4 text-xs font-bold uppercase tracking-wider flex items-center justify-between bg-paper border border-[#b64400] text-[#b64400] rounded-[18px]"
                >
                  <div className="flex items-center gap-2.5">
                    <AlertTriangle className="h-4.5 w-4.5 shrink-0" />
                    <span>OFFLINE STATUS DETECTED — DISPLAYING LOCAL FORECASTS</span>
                  </div>
                  <button
                    onClick={() => fetchWeather(currentLocation.lat, currentLocation.lon)}
                    className="p-1 hover:bg-[#b64400]/10 border border-[#b64400] uppercase px-2.5 py-1 transition-colors cursor-pointer rounded-full"
                  >
                    RETRY
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            {!isLoading && error && !weatherData && (
              <div className="p-8 text-center max-w-lg mx-auto bg-paper border border-[#b64400] text-[#b64400] flex flex-col items-center my-8 rounded-[28px]">
                <AlertTriangle className="h-10 w-10 text-[#b64400] mb-4" />
                <h3 className="text-base font-bold uppercase tracking-wider mb-2 font-sans tracking-[-0.015em]">
                  CONNECTION DISRUPTED
                </h3>
                <p className="text-xs mb-6 max-w-xs leading-relaxed text-[#b64400]/80">
                  {error.toUpperCase() || "UNABLE TO ESTABLISH DATA STREAM. VERIFY SERVER CONNECTIVITY."}
                </p>
                <button
                  onClick={() => fetchWeather(currentLocation.lat, currentLocation.lon)}
                  className="flex items-center gap-2 border border-[#b64400] hover:bg-[#b64400] hover:text-white uppercase text-xs font-bold px-4 py-2 cursor-pointer transition-colors duration-200 rounded-full"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  <span>REESTABLISH PATH</span>
                </button>
              </div>
            )}
          </div>

          {(weatherData || isLoading) && (
            <>
              {/* 1. Hero Section (Gradient Dark Band) */}
              <section className="relative w-full text-center pt-16 pb-24 px-4 md:px-6 lg:px-12 bg-gradient-to-b from-[#1d1d1f] via-[#08182d] to-[#0d0d0f] text-white overflow-hidden">
                <div className="relative z-10 max-w-4xl mx-auto flex flex-col items-center">
                  
                  {/* Eyebrow */}
                  <span className="text-[11px] font-sans tracking-[0.25em] text-[#2997ff] uppercase font-semibold mb-4">
                    METEOROLOGICAL SHOWCASE
                  </span>

                  {/* Title / City Name */}
                  <h1 className="font-sans text-5xl md:text-8xl font-bold tracking-tight text-white leading-none">
                    {cityTitle}
                  </h1>

                  {/* Subtitle */}
                  {cityCountry && (
                    <p className="text-xs tracking-[0.1em] text-mid-gray mt-2 uppercase font-medium">
                      {cityCountry}
                    </p>
                  )}

                  {/* Condition Tagline */}
                  {current && weatherDetails && (
                    <p className="text-xl md:text-2xl font-light text-[#f5f5f7]/90 mt-6 max-w-2xl mx-auto">
                      Currently {weatherDetails.label.toLowerCase()}. Temperature is {Math.round(current.temp)}°C.
                    </p>
                  )}

                  {/* Action Buttons */}
                  <div className="flex justify-center items-center gap-4 mt-8">
                    <button
                      onClick={() => getUserLocation()}
                      className="bg-[#0071e3] text-white px-6 py-2.5 rounded-full text-sm font-semibold hover:bg-[#0066cc] transition-colors shadow-none cursor-pointer"
                    >
                      Locate Me
                    </button>
                    <a
                      href="#metrics"
                      className="border border-[#0066cc] text-[#2997ff] px-6 py-2.5 rounded-full text-sm font-semibold hover:bg-[#0066cc]/10 transition-colors cursor-pointer"
                    >
                      View Specs
                    </a>
                  </div>

                  {/* Floating Map Device container */}
                  <div className="w-full max-w-5xl mx-auto mt-16 px-2 md:px-6">
                    <div className="relative w-full h-[400px] md:h-[520px] rounded-[28px] overflow-hidden border border-[#333] shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
                      {weatherData ? (
                        <div className="relative w-full h-full">
                          {isLoading && (
                            <div className="absolute top-4 right-4 z-20 bg-paper/90 backdrop-blur-md px-3 py-1.5 flex items-center gap-2 rounded-full border border-hairline shadow-sm text-ink">
                              <DottedProgress size={3} />
                              <span className="text-[9px] uppercase font-bold text-mid-gray tracking-wider">
                                SYNCHRONIZING...
                              </span>
                            </div>
                          )}
                          <MapWrapper
                            lat={currentLocation.lat}
                            lon={currentLocation.lon}
                            activeLayer={activeLayer}
                            layers={weatherData.layers}
                            styleMode={styleMode}
                            theme={theme}
                            onMarkerClick={handleMarkerClick}
                            onMapClick={handleMapClick}
                          />
                        </div>
                      ) : (
                        <div className="w-full h-full bg-[#1c1c1e] flex flex-col items-center justify-center gap-4 animate-pulse rounded-[28px]">
                          <DottedProgress size={5} />
                          <span className="text-xs font-semibold text-mid-gray tracking-widest uppercase">
                            LOADING MAP GRID...
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Horizontal Layer Selector styled as a Segmented Control */}
                  <div className="flex justify-center items-center gap-2.5 mt-8 bg-[#1d1d1f]/60 p-1.5 rounded-full border border-[#333]">
                    {(["temp", "rain", "wind"] as const).map((layer) => (
                      <button
                        key={layer}
                        onClick={() => setActiveLayer(layer)}
                        className={`px-5 py-2 rounded-full text-xs font-semibold uppercase tracking-wider transition-all duration-300 cursor-pointer ${
                          activeLayer === layer
                            ? "bg-[#0071e3] text-white"
                            : "text-[#858585] hover:text-white"
                        }`}
                      >
                        {layer === "temp" ? "Temperature" : layer === "rain" ? "Precipitation" : "Wind"}
                      </button>
                    ))}
                  </div>

                </div>
              </section>

              {/* 2. Specs / Metrics Grid (Frost Grey Band) */}
              <section id="metrics" className="w-full py-20 px-4 md:px-6 lg:px-12 bg-[#f5f5f7] dark:bg-[#0c0c0e] transition-colors duration-300">
                <div className="max-w-5xl mx-auto">
                  <h2 className="text-3xl md:text-4xl font-semibold tracking-tight text-ink text-center mb-16 font-sans">
                    Current Atmospheric Specs
                  </h2>

                  {current ? (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-y-16 gap-x-12 max-w-4xl mx-auto text-center">
                      <div>
                        <p className="text-4xl md:text-5xl font-bold tracking-tight text-ink font-sans">
                          {Math.round(current.feelsLike)}°C
                        </p>
                        <p className="text-[11px] text-mid-gray uppercase tracking-widest font-bold mt-2.5">
                          FEELS LIKE
                        </p>
                      </div>
                      <div>
                        <p className="text-4xl md:text-5xl font-bold tracking-tight text-ink font-sans">
                          {current.humidity}%
                        </p>
                        <p className="text-[11px] text-mid-gray uppercase tracking-widest font-bold mt-2.5">
                          HUMIDITY
                        </p>
                      </div>
                      <div>
                        <p className="text-4xl md:text-5xl font-bold tracking-tight text-ink font-sans">
                          {Math.round(current.windSpeed)} km/h
                        </p>
                        <p className="text-[11px] text-mid-gray uppercase tracking-widest font-bold mt-2.5">
                          WIND SPEED
                        </p>
                      </div>
                      <div>
                        <p className="text-4xl md:text-5xl font-bold tracking-tight text-ink font-sans">
                          {current.pressure} hPa
                        </p>
                        <p className="text-[11px] text-mid-gray uppercase tracking-widest font-bold mt-2.5">
                          BAROMETRIC PRESSURE
                        </p>
                      </div>
                      <div>
                        <p className="text-4xl md:text-5xl font-bold tracking-tight text-ink font-sans">
                          {current.uvIndex} <span className="text-sm font-semibold text-mid-gray uppercase">({getUVDescription(current.uvIndex)})</span>
                        </p>
                        <p className="text-[11px] text-mid-gray uppercase tracking-widest font-bold mt-2.5">
                          UV INDEX EXPOSURE
                        </p>
                      </div>
                      <div>
                        <p className="text-2xl md:text-3xl font-bold tracking-tight text-ink font-sans pt-1">
                          {current.sunrise} / {current.sunset}
                        </p>
                        <p className="text-[11px] text-mid-gray uppercase tracking-widest font-bold mt-3">
                          DAYLIGHT INTERVAL
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="h-40 flex items-center justify-center">
                      <DottedProgress size={4} />
                    </div>
                  )}
                </div>
              </section>

              {/* 3. 5-Day Forecast (White Band with Pastel Color Swatches) */}
              <section className="w-full py-20 px-4 md:px-6 lg:px-12 bg-white dark:bg-[#000000] transition-colors duration-300">
                <div className="max-w-5xl mx-auto">
                  <h2 className="text-3xl md:text-4xl font-semibold tracking-tight text-ink text-center mb-16 font-sans">
                    5-Day Weather Swatches
                  </h2>

                  {weatherData ? (
                    <div className="grid grid-cols-1 sm:grid-cols-5 gap-6">
                      {weatherData.forecast.slice(1, 6).map((day) => {
                        // date conversion helper
                        const d = new Date(day.date);
                        const weekday = isNaN(d.getTime()) 
                          ? "DAY" 
                          : d.toLocaleDateString("en-US", { weekday: "long" }).toUpperCase();
                        const label = isNaN(d.getTime()) 
                          ? day.date 
                          : d.toLocaleDateString("en-US", { month: "short", day: "numeric" }).toUpperCase();

                        const dayWeather = getWeatherDetails(day.weatherCode);
                        const DayIcon = dayWeather.icon;

                        const isDark = theme === "dark";
                        const swatchBgClass = getAppleSwatch(day.weatherCode, isDark);

                        return (
                          <div
                            key={day.date}
                            className={`p-6 flex flex-col justify-between items-center text-center h-64 rounded-[28px] transition-all duration-300 ${swatchBgClass} border border-transparent shadow-none`}
                          >
                            <div>
                              <p className="text-[10px] font-semibold tracking-widest opacity-80 uppercase mb-0.5">
                                {weekday}
                              </p>
                              <p className="text-[9px] font-medium tracking-wide opacity-60 uppercase">
                                {label}
                              </p>
                            </div>

                            <div className="h-12 w-12 flex items-center justify-center rounded-full bg-white/20 dark:bg-black/10">
                              <DayIcon className="h-6 w-6" />
                            </div>

                            <div>
                              <p className="text-3xl font-bold tracking-tight">
                                {Math.round(day.tempMax)}°
                              </p>
                              <p className="text-xs opacity-75 font-semibold mt-1">
                                {dayWeather.label.toLowerCase()}
                              </p>
                            </div>

                            <div className="flex gap-3 text-[9px] font-semibold opacity-70">
                              <span className="flex items-center gap-0.5">
                                <Droplets className="h-2.5 w-2.5" />
                                {day.rainProb}%
                              </span>
                              <span className="flex items-center gap-0.5">
                                <Wind className="h-2.5 w-2.5" />
                                {Math.round(day.windSpeed)}k
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="h-40 flex items-center justify-center">
                      <DottedProgress size={4} />
                    </div>
                  )}
                </div>
              </section>

            </>
          )}

        </main>

        {/* Global footer */}
        <footer className="w-full border-t border-hairline bg-[#f5f5f7] dark:bg-[#0c0c0e] py-8 transition-colors duration-300">
          <div className="w-full max-w-5xl mx-auto px-6 flex items-center justify-between text-[11px] font-sans tracking-[0.05em] font-medium text-mid-gray uppercase">
            <span>© SUNBLOCK INC. 2026</span>
            <div className="flex gap-6">
              <a href="#" className="hover:text-ink">Radar Details</a>
              <a href="#" className="hover:text-ink">Stations</a>
              <a href="#" className="hover:text-ink">API Spec</a>
            </div>
          </div>
        </footer>

      </div>
    );
  }

  // --- FROSTED PAPER / GALLERY GRID DEFAULT GRID RENDERING ---
  return (
    <div className="min-h-screen flex flex-col pb-12 transition-colors duration-300">
      
      {/* Dynamic layout header */}
      <Header
        styleMode={styleMode}
        changeStyleMode={changeStyleMode}
        theme={theme}
        toggleTheme={toggleTheme}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        searchResults={searchResults}
        isSearching={isSearching}
        setCurrentLocation={setCurrentLocation}
        getUserLocation={getUserLocation}
      />

      <main 
        className={`${
          isGallery 
            ? "w-full border-t-2 border-hairline px-4 md:px-6" 
            : "w-full px-4 md:px-6 py-6 md:py-8"
        }`}
      >
        
        {/* Banner Alert: Offline Mode (using single Destructive red color theme #e7000b) */}
        <AnimatePresence>
          {isOffline && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className={`mb-6 p-4 text-xs font-bold uppercase tracking-wider flex items-center justify-between bg-paper border-[#e7000b] text-[#e7000b] ${
                isGallery ? "border-2 font-condensed tracking-[0.15em] rounded-none" : "border rounded-[18px] shadow-sm"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <AlertTriangle className="h-4.5 w-4.5 shrink-0" />
                <span>OFFLINE STATUS DETECTED — DISPLAYING LOCAL FORECASTS</span>
              </div>
              <button
                onClick={() => fetchWeather(currentLocation.lat, currentLocation.lon)}
                className="p-1 hover:bg-[#e7000b]/10 border border-[#e7000b] uppercase px-2.5 py-1 transition-colors cursor-pointer"
              >
                RETRY
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Banner Alert: Weather Fetching Error (using supporting accent Ember red #e7000b) */}
        {!isLoading && error && !weatherData && (
          <div 
            className={`p-8 text-center max-w-lg mx-auto bg-paper border-[#e7000b] text-[#e7000b] flex flex-col items-center my-8 ${
              isGallery ? "border-2 rounded-none" : "border rounded-[24px] shadow-sm"
            }`}
          >
            <AlertTriangle className="h-10 w-10 text-[#e7000b] mb-4" />
            <h3 className={`text-base font-bold uppercase tracking-wider mb-2 ${isGallery ? "font-condensed tracking-[0.2em]" : ""}`}>
              CONNECTION DISRUPTED
            </h3>
            <p className={`text-xs mb-6 max-w-xs leading-relaxed text-[#e7000b]/80 ${isGallery ? "font-condensed tracking-[0.1em]" : ""}`}>
              {error.toUpperCase() || "UNABLE TO ESTABLISH DATA STREAM. VERIFY SERVER CONNECTIVITY."}
            </p>
            <button
              onClick={() => fetchWeather(currentLocation.lat, currentLocation.lon)}
              className="flex items-center gap-2 border border-[#e7000b] hover:bg-[#e7000b] hover:text-paper uppercase text-xs font-bold px-4 py-2 cursor-pointer transition-colors active:scale-95 duration-200"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span className={isGallery ? "font-condensed tracking-[0.15em]" : ""}>REESTABLISH PATH</span>
            </button>
          </div>
        )}

        {/* Dashboard Grid Content */}
        {(weatherData || isLoading) && (
          <div 
            className={`grid grid-cols-1 lg:grid-cols-12 ${
              isGallery ? "gap-0" : "gap-6 items-stretch"
            }`}
          >
            
            {/* Left Panel: Map Radar (70% - Col Span 8) */}
            <div 
              className={`lg:col-span-8 flex flex-col justify-between ${
                isGallery ? "p-6 bg-paper gap-6 border-r-2 border-hairline" : "gap-6"
              }`}
            >
              <div className="flex-1 min-h-[400px] md:min-h-[500px]">
                {weatherData ? (
                  <div className="relative w-full h-full">
                    {isLoading && (
                      <div 
                        className={`absolute top-4 right-4 z-20 bg-paper px-3 py-1.5 flex items-center gap-2 ${
                          isGallery 
                            ? "border-2 border-ink rounded-none" 
                            : "border border-hairline shadow-sm rounded-full bg-paper/85 backdrop-blur-md"
                        }`}
                      >
                        <DottedProgress size={3} />
                        <span className={`text-[9px] uppercase font-bold text-mid-gray ${isGallery ? "font-condensed tracking-[0.2em]" : "tracking-wider"}`}>
                          SYNCHRONIZING...
                        </span>
                      </div>
                    )}
                    <MapWrapper
                      lat={currentLocation.lat}
                      lon={currentLocation.lon}
                      activeLayer={activeLayer}
                      layers={weatherData.layers}
                      styleMode={styleMode}
                      theme={theme}
                      onMarkerClick={handleMarkerClick}
                      onMapClick={handleMapClick}
                    />
                  </div>
                ) : (
                  <div 
                    className={`w-full h-full min-h-[400px] md:min-h-[500px] bg-canvas/30 flex flex-col items-center justify-center gap-4 animate-pulse ${
                      isGallery ? "border-2 border-hairline rounded-none" : "border border-hairline rounded-[24px]"
                    }`}
                  >
                    <DottedProgress size={5} />
                    <span className="text-xs font-semibold text-mid-gray tracking-widest uppercase">
                      LOADING MAP GRID...
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Right Panel: Current Weather Stats Card & Forecast Overlay (30% - Col Span 4) */}
            <div 
              className={`lg:col-span-4 h-full flex flex-col gap-6 ${
                isGallery ? "p-6 bg-paper" : ""
              }`}
            >
              {isLoading && !weatherData ? (
                renderSidebarSkeleton()
              ) : (
                weatherData && (
                  <>
                    <WeatherCard
                      locationName={currentLocation.name}
                      data={weatherData}
                      activeLayer={activeLayer}
                      setActiveLayer={setActiveLayer}
                      styleMode={styleMode}
                    />
                    <ForecastOverlay 
                      forecast={weatherData.forecast} 
                      styleMode={styleMode} 
                    />
                  </>
                )
              )}
            </div>

          </div>
        )}

      </main>

      {/* Museum-style Footer Bar for Gallery Mode */}
      {isGallery && (
        <footer className="w-full border-t border-hairline bg-paper mt-12">
          <div className="w-full px-6 py-5 flex items-center justify-between text-[10px] font-sans tracking-[0.05em] font-medium text-mid-gray uppercase">
            <span>© SUNBLOCK INC. 2026</span>
            <div className="flex gap-6">
              <a href="#" className="hover:text-ink">Radar Details</a>
              <a href="#" className="hover:text-ink"><span>Stations</span></a>
              <a href="#" className="hover:text-ink">API Spec</a>
            </div>
          </div>
        </footer>
      )}
    </div>
  );
}
