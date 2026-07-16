"use client";

import { useState, useRef, useEffect } from "react";
import { Search, Compass, MapPin, Grid, Sun, Moon } from "lucide-react";
import { LocationResult } from "../types/weather";
import { StyleModeType } from "../hooks/useWeather";
import { ThemeType } from "../hooks/useWeather";
import { motion, AnimatePresence } from "framer-motion";

interface HeaderProps {
  styleMode: StyleModeType;
  toggleStyleMode: () => void;
  theme: ThemeType;
  toggleTheme: () => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  searchResults: LocationResult[];
  isSearching: boolean;
  setCurrentLocation: (loc: { name: string; lat: number; lon: number }) => void;
  getUserLocation: () => void;
}

export default function Header({
  styleMode,
  toggleStyleMode,
  theme,
  toggleTheme,
  searchQuery,
  setSearchQuery,
  searchResults,
  isSearching,
  setCurrentLocation,
  getUserLocation,
}: HeaderProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelectResult = (result: LocationResult) => {
    const fullName = `${result.name}, ${result.admin ? result.admin + ", " : ""}${result.country}`;
    setCurrentLocation({
      name: fullName,
      lat: result.lat,
      lon: result.lon,
    });
    setSearchQuery("");
    setDropdownOpen(false);
  };

  const isGallery = styleMode === "gallery";

  return (
    <header 
      className={`${
        isGallery 
          ? "border-b-2 border-hairline bg-paper w-full z-50 sticky top-0" 
          : "sticky top-4 z-50 mx-auto w-full px-4 md:px-6"
      }`}
    >
      <div 
        className={`${
          isGallery 
            ? "flex items-center justify-between py-4 px-6 w-full mx-auto" 
            : "glass-capsule flex items-center justify-between p-2 pl-4 md:p-3 md:pl-6 border border-hairline shadow-main bg-paper/70 backdrop-blur-md"
        }`}
      >
        
        {/* Branding */}
        <div className="flex items-center gap-3">
          {/* Animated Eclipse Logo */}
          <div className="relative flex h-10 w-10 items-center justify-center select-none shrink-0">
            {/* Ambient Corona Shadow */}
            <div className="absolute inset-0 rounded-full bg-ink opacity-10 blur-[4px] animate-corona-glow" />
            
            <svg viewBox="0 0 100 100" className="h-full w-full relative z-10">
              {/* Pulsing Sun Corona Ring */}
              <circle
                cx="50"
                cy="50"
                r="38"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeDasharray="5 3"
                className="text-ink animate-corona-rotate"
              />
              {/* Solid glowing Sun Core */}
              <circle
                cx="50"
                cy="50"
                r="26"
                fill="currentColor"
                className="text-ink opacity-90"
              />
              {/* Blocking Moon Core */}
              <circle
                cx="44"
                cy="44"
                r="25"
                fill="var(--color-paper)"
                className="animate-moon-slide"
              />
            </svg>
          </div>

          <span 
            className={`${
              isGallery 
                ? "font-sans text-xl font-light tracking-[-0.02em] text-ink uppercase" 
                : "font-sans text-lg md:text-xl font-bold tracking-tight text-ink"
            }`}
          >
            SUN<span className="text-mid-gray font-light">BLOCK</span>
          </span>
          {isGallery && (
            <span className="text-[10px] font-condensed tracking-[0.2em] text-mid-gray uppercase border border-hairline px-2 py-0.5 ml-1 font-medium">
              MONO-X7
            </span>
          )}
        </div>

        {/* Search Bar Capsule */}
        <div className="relative flex-1 max-w-xs sm:max-w-md mx-4" ref={dropdownRef}>
          <div 
            className={`${
              isGallery 
                ? "relative flex items-center w-full bg-transparent border-b border-ink px-1 py-1" 
                : "relative flex items-center w-full rounded-full bg-canvas/60 border border-transparent px-3 py-1.5 focus-within:border-hairline focus-within:bg-paper transition-all duration-300"
            }`}
          >
            <Search className="h-4 w-4 text-mid-gray mr-2 shrink-0" />
            <input
              type="text"
              placeholder={isGallery ? "ENTER CITY NAME..." : "Search cities..."}
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setDropdownOpen(true);
              }}
              onFocus={() => setDropdownOpen(true)}
              className={`w-full bg-transparent text-sm text-ink focus:outline-none ${
                isGallery 
                  ? "placeholder-mid-gray/40 uppercase font-condensed tracking-[0.1em] text-xs font-semibold" 
                  : "placeholder-mid-gray/60"
              }`}
            />
            
            <button
              onClick={getUserLocation}
              title="Use current location"
              className={`p-1 text-mid-gray hover:text-ink transition-colors ${
                isGallery 
                  ? "font-condensed text-[10px] tracking-[0.15em] font-semibold border border-hairline px-2.5 py-0.5 hover:bg-ink hover:text-paper" 
                  : "rounded-full hover:bg-canvas"
              }`}
            >
              {isGallery ? "LOCATE" : <Compass className="h-4 w-4" />}
            </button>
          </div>

          {/* Search Dropdown */}
          <AnimatePresence>
            {dropdownOpen && (searchQuery.length >= 2 || isSearching) && (
              <motion.div
                initial={{ opacity: 0, y: isGallery ? 0 : 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: isGallery ? 0 : 10 }}
                transition={{ duration: 0.15 }}
                className={`absolute left-0 right-0 mt-2 bg-paper shadow-main border border-hairline overflow-hidden max-h-60 overflow-y-auto z-50 ${
                  isGallery ? "rounded-none border-2" : "rounded-2xl"
                }`}
              >
                {isSearching ? (
                  <div className={`p-4 text-center text-xs text-mid-gray ${isGallery ? "font-condensed tracking-[0.1em] font-semibold" : ""}`}>
                    SEARCHING...
                  </div>
                ) : searchResults.length === 0 ? (
                  <div className={`p-4 text-center text-xs text-mid-gray ${isGallery ? "font-condensed tracking-[0.1em] font-semibold" : ""}`}>
                    NO RESULTS FOUND.
                  </div>
                ) : (
                  <ul className="py-1">
                    {searchResults.map((result) => (
                      <li key={result.id}>
                        <button
                          onClick={() => handleSelectResult(result)}
                          className={`w-full flex items-center text-left px-4 py-2.5 hover:bg-canvas border-b border-hairline/40 last:border-0 text-sm text-ink transition-colors duration-150 ${
                            isGallery ? "font-condensed tracking-[0.05em] uppercase font-medium rounded-none" : ""
                          }`}
                        >
                          <MapPin className="h-4 w-4 text-mid-gray mr-2 shrink-0" />
                          <div className="truncate">
                            <span className="font-semibold text-ink">
                              {result.name}
                            </span>
                            {result.admin && (
                              <span className="text-xs text-mid-gray/70 ml-1.5">
                                {result.admin}
                              </span>
                            )}
                            <span className="text-xs text-mid-gray font-bold ml-1.5 uppercase">
                              ({result.countryCode})
                            </span>
                          </div>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Customization toggles */}
        <div className="flex items-center gap-2.5">
          {/* Theme Mode Switcher */}
          {isGallery ? (
            <button
              onClick={toggleTheme}
              className="font-condensed text-[11px] tracking-[0.2em] font-medium text-ink hover:text-mid-gray uppercase cursor-pointer border-2 border-ink px-3 py-1 bg-paper hover:bg-ink hover:text-paper transition-all duration-300"
              title={theme === "dark" ? "LIGHT THEME" : "DARK THEME"}
            >
              <span>{theme === "dark" ? "LIGHT" : "DARK"}</span>
            </button>
          ) : (
            <button
              onClick={toggleTheme}
              className="p-2 rounded-full border border-hairline hover:border-ink bg-canvas/30 text-mid-gray hover:text-ink transition-all duration-300 cursor-pointer"
              title={theme === "dark" ? "Light Mode" : "Dark Mode"}
            >
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
          )}

          {/* Style Selector Toggle */}
          {isGallery ? (
            <button
              onClick={toggleStyleMode}
              className="font-condensed text-[11px] tracking-[0.2em] font-medium text-ink hover:text-mid-gray uppercase cursor-pointer border-2 border-ink px-3 py-1 bg-paper hover:bg-ink hover:text-paper transition-all duration-300"
            >
              <span>FROSTED MODE</span>
            </button>
          ) : (
            <button
              onClick={toggleStyleMode}
              className="mono-btn-outline px-4 py-1.5 text-xs font-semibold uppercase tracking-wider cursor-pointer hover:bg-ink hover:text-paper transition-all duration-300"
            >
              <span>GALLERY GRID</span>
            </button>
          )}
        </div>

      </div>
    </header>
  );
}
