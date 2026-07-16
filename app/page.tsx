"use client";

import { useWeather } from "../hooks/useWeather";
import Header from "../components/Header";
import WeatherCard from "../components/WeatherCard";
import MapWrapper from "../components/MapWrapper";
import ForecastOverlay from "../components/ForecastOverlay";
import DottedProgress from "../components/DottedProgress";
import { CloudLightning, WifiOff, RefreshCw, Compass } from "lucide-react";
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
    theme,
    toggleTheme,
    accent,
    selectAccent,
    activeLayer,
    setActiveLayer,
    isOffline,
    getUserLocation,
  } = useWeather();

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
    <div className="glass-panel p-6 md:p-8 h-full border border-glass animate-pulse">
      <div className="h-4 w-28 bg-secondary/60 rounded-full mb-3" />
      <div className="h-8 w-48 bg-secondary/80 rounded-lg mb-2" />
      <div className="h-4 w-32 bg-secondary/40 rounded-full mb-8" />
      
      <div className="flex justify-between items-center mb-10">
        <div>
          <div className="h-16 w-28 bg-secondary/80 rounded-2xl mb-2" />
          <div className="h-4 w-20 bg-secondary/60 rounded-full" />
        </div>
        <div className="h-20 w-20 bg-secondary/50 rounded-3xl" />
      </div>

      <div className="grid grid-cols-2 gap-4 mb-8">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-14 bg-secondary/35 border border-glass/30 rounded-2xl" />
        ))}
      </div>

      <div className="border-t border-glass/40 pt-6">
        <div className="h-4 w-24 bg-secondary/60 rounded-full mb-4" />
        <div className="flex flex-col gap-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-11 bg-secondary/35 border border-glass/30 rounded-2xl" />
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col pb-12 transition-colors duration-300">
      
      {/* Floating capsule navigation */}
      <Header
        theme={theme}
        toggleTheme={toggleTheme}
        accent={accent}
        selectAccent={selectAccent}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        searchResults={searchResults}
        isSearching={isSearching}
        setCurrentLocation={setCurrentLocation}
        getUserLocation={getUserLocation}
      />

      <main className="mx-auto w-full max-w-7xl px-4 md:px-8 py-6 md:py-8 flex-1">
        
        {/* Banner Alert: Offline Mode */}
        <AnimatePresence>
          {isOffline && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="mb-6 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-500 p-4 text-sm font-semibold tracking-wide flex items-center justify-between shadow-md"
            >
              <div className="flex items-center gap-2.5">
                <WifiOff className="h-4.5 w-4.5 shrink-0" />
                <span>You are currently offline. Displaying cached weather records.</span>
              </div>
              <button
                onClick={() => fetchWeather(currentLocation.lat, currentLocation.lon)}
                className="p-1.5 hover:bg-amber-500/20 rounded-full transition-colors active:scale-90"
                title="Retry connecting"
              >
                <RefreshCw className="h-4 w-4" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Banner Alert: Weather Fetching Error (if no current cache exists) */}
        {!isLoading && error && !weatherData && (
          <div className="glass-panel p-8 text-center max-w-lg mx-auto border border-red-500/30 my-8 flex flex-col items-center">
            <CloudLightning className="h-12 w-12 text-accent mb-4 animate-pulse" />
            <h3 className="text-lg font-bold font-serif mb-2 text-primary">Connection Lost</h3>
            <p className="text-sm text-text-secondary mb-6 max-w-sm leading-relaxed">
              {error || "We encountered an issue fetching forecast records. Check your internet connection or try again."}
            </p>
            <button
              onClick={() => fetchWeather(currentLocation.lat, currentLocation.lon)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-accent hover:bg-accent-hover text-white text-sm font-semibold tracking-wide shadow-lg shadow-accent/20 cursor-pointer active:scale-95 transition-transform"
            >
              <RefreshCw className="h-4 w-4" />
              <span>Retry Fetching Weather</span>
            </button>
          </div>
        )}

        {/* Dashboard Grid Content */}
        {(weatherData || isLoading) && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
            
            {/* Left Panel: Weather stats metrics */}
            <div className="lg:col-span-4 h-full flex flex-col">
              {isLoading && !weatherData ? (
                renderWeatherCardSkeleton()
              ) : (
                <div className="h-full flex-1">
                  <WeatherCard
                    locationName={currentLocation.name}
                    data={weatherData}
                    activeLayer={activeLayer}
                    setActiveLayer={setActiveLayer}
                  />
                </div>
              )}
            </div>

            {/* Right Panel: Map Radar + Forecast Overlay */}
            <div className="lg:col-span-8 flex flex-col gap-6 h-full justify-between">
              
              {/* Leaflet Map Radar card */}
              <div className="flex-1 min-h-[400px] md:min-h-[500px]">
                {weatherData ? (
                  <div className="relative w-full h-full">
                    {isLoading && (
                      <div className="absolute top-4 right-4 z-20 rounded-full glass-capsule border border-glass bg-secondary/85 px-3 py-1 flex items-center gap-2">
                        <DottedProgress size={3} />
                        <span className="text-[10px] uppercase font-bold text-text-secondary tracking-widest">
                          Updating...
                        </span>
                      </div>
                    )}
                    <MapWrapper
                      lat={currentLocation.lat}
                      lon={currentLocation.lon}
                      activeLayer={activeLayer}
                      layers={weatherData.layers}
                      theme={theme}
                      onMarkerClick={handleMarkerClick}
                    />
                  </div>
                ) : (
                  <div className="w-full h-full min-h-[400px] md:min-h-[500px] rounded-[24px] border border-glass bg-secondary/15 flex flex-col items-center justify-center gap-4 animate-pulse">
                    <DottedProgress size={5} />
                    <span className="text-xs font-semibold text-text-secondary tracking-widest uppercase">
                      Loading Map Overlay...
                    </span>
                  </div>
                )}
              </div>

              {/* 5-Day Forecast overlay */}
              <div className="w-full">
                {isLoading && !weatherData ? (
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-3.5 animate-pulse">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <div key={i} className="h-32 glass-panel border border-glass/40 bg-secondary/15 rounded-2xl" />
                    ))}
                  </div>
                ) : (
                  weatherData && <ForecastOverlay forecast={weatherData.forecast} />
                )}
              </div>

            </div>

          </div>
        )}

      </main>
    </div>
  );
}
