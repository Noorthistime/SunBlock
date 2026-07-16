"use client";

import { useWeather } from "../hooks/useWeather";
import Header from "../components/Header";
import WeatherCard from "../components/WeatherCard";
import MapWrapper from "../components/MapWrapper";
import ForecastOverlay from "../components/ForecastOverlay";
import DottedProgress from "../components/DottedProgress";
import { AlertTriangle, RefreshCw, Wifi } from "lucide-react";
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
    toggleStyleMode,
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

  // Weather Card Loading Skeleton
  const renderWeatherCardSkeleton = () => (
    <div className={`mono-card p-6 md:p-8 h-full bg-paper animate-pulse ${isGallery ? "border-2 rounded-none" : "border rounded-[24px]"}`}>
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
  );

  return (
    <div className="min-h-screen flex flex-col pb-12 transition-colors duration-300">
      
      {/* Dynamic layout header */}
      <Header
        styleMode={styleMode}
        toggleStyleMode={toggleStyleMode}
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
            ? "w-full max-w-[1280px] mx-auto border-t-2 border-hairline" 
            : "mx-auto w-full max-w-7xl px-4 md:px-8 py-6 md:py-8"
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
            
            {/* Left Panel: Weather stats metrics */}
            <div 
              className={`lg:col-span-4 h-full flex flex-col ${
                isGallery ? "border-r-2 border-hairline p-6 bg-paper" : ""
              }`}
            >
              {isLoading && !weatherData ? (
                renderWeatherCardSkeleton()
              ) : (
                <div className="h-full flex-1">
                  <WeatherCard
                    locationName={currentLocation.name}
                    data={weatherData}
                    activeLayer={activeLayer}
                    setActiveLayer={setActiveLayer}
                    styleMode={styleMode}
                  />
                </div>
              )}
            </div>

            {/* Right Panel: Map Radar + Forecast Overlay */}
            <div 
              className={`lg:col-span-8 flex flex-col h-full justify-between ${
                isGallery ? "p-6 bg-paper gap-6" : "gap-6"
              }`}
            >
              
              {/* Leaflet Map Radar card */}
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
                      onMarkerClick={handleMarkerClick}
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

              {/* 5-Day Forecast overlay */}
              <div className="w-full">
                {isLoading && !weatherData ? (
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-3.5 animate-pulse">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <div 
                        key={i} 
                        className={`h-32 bg-canvas/30 border border-hairline ${
                          isGallery ? "rounded-none border-2" : "rounded-2xl"
                        }`} 
                      />
                    ))}
                  </div>
                ) : (
                  weatherData && <ForecastOverlay forecast={weatherData.forecast} styleMode={styleMode} />
                )}
              </div>

            </div>

          </div>
        )}

      </main>

      {/* Museum-style Footer Bar for Gallery Mode / Clean subtle footer for Frosted */}
      {isGallery && (
        <footer className="w-full border-t-2 border-hairline bg-paper mt-12">
          <div className="max-w-[1280px] mx-auto px-6 py-5 flex items-center justify-between text-[10px] font-condensed tracking-[0.2em] font-medium text-mid-gray uppercase">
            <span>© SUNBLOCK INC. 2026</span>
            <div className="flex gap-6">
              <a href="#" className="hover:text-ink">Radar Details</a>
              <a href="#" className="hover:text-ink">Stations</a>
              <a href="#" className="hover:text-ink">API Spec</a>
            </div>
          </div>
        </footer>
      )}
    </div>
  );
}
