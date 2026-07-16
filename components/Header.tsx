"use client";

import { useState, useRef, useEffect } from "react";
import { Sun, Moon, Search, Compass, Palette, MapPin } from "lucide-react";
import { AccentType, LocationResult, ThemeType } from "../types/weather";
import { motion, AnimatePresence } from "framer-motion";

interface HeaderProps {
  theme: ThemeType;
  toggleTheme: () => void;
  accent: AccentType;
  selectAccent: (accent: AccentType) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  searchResults: LocationResult[];
  isSearching: boolean;
  setCurrentLocation: (loc: { name: string; lat: number; lon: number }) => void;
  getUserLocation: () => void;
}

export default function Header({
  theme,
  toggleTheme,
  accent,
  selectAccent,
  searchQuery,
  setSearchQuery,
  searchResults,
  isSearching,
  setCurrentLocation,
  getUserLocation,
}: HeaderProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [showAccentPicker, setShowAccentPicker] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const pickerRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
      if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
        setShowAccentPicker(false);
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

  const accentsList: { name: string; value: AccentType; color: string }[] = [
    { name: "Nothing Red", value: "red", color: "bg-[#ff2d55]" },
    { name: "Warm Orange", value: "orange", color: "bg-[#f2994a]" },
    { name: "Forest Green", value: "green", color: "bg-[#27ae60]" },
    { name: "Ocean Blue", value: "blue", color: "bg-[#2f80ed]" },
  ];

  return (
    <header className="sticky top-4 z-50 mx-auto w-full max-w-7xl px-4 md:px-8">
      <div className="glass-capsule flex items-center justify-between p-2 pl-4 md:p-3 md:pl-6 border border-glass shadow-glass">
        
        {/* Branding */}
        <div className="flex items-center gap-2">
          <div className="relative flex h-8 w-8 items-center justify-center rounded-full bg-accent text-white shadow-[0_0_12px_var(--accent-color-glow)]">
            <Sun className="h-4.5 w-4.5 animate-spin-slow" />
          </div>
          <span className="font-serif text-lg md:text-xl font-black tracking-tight text-primary transition-all duration-300">
            SUN<span className="text-accent">BLOCK</span>
          </span>
        </div>

        {/* Search Bar Capsule */}
        <div className="relative flex-1 max-w-sm md:max-w-md mx-4" ref={dropdownRef}>
          <div className="relative flex items-center w-full rounded-full bg-secondary/35 border border-glass px-3 py-1.5 focus-within:border-accent/40 focus-within:shadow-[0_0_12px_var(--accent-color-glow)] transition-all duration-300">
            <Search className="h-4.5 w-4.5 text-text-secondary/70 mr-2" />
            <input
              type="text"
              placeholder="Search cities..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setDropdownOpen(true);
              }}
              onFocus={() => setDropdownOpen(true)}
              className="w-full bg-transparent text-sm text-primary placeholder-text-secondary/60 focus:outline-none"
            />
            
            <button
              onClick={getUserLocation}
              title="Use current location"
              className="p-1 rounded-full text-text-secondary hover:text-accent hover:bg-secondary/60 transition-colors"
            >
              <Compass className="h-4 w-4" />
            </button>
          </div>

          {/* Search Dropdown */}
          <AnimatePresence>
            {dropdownOpen && (searchQuery.length >= 2 || isSearching) && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                transition={{ duration: 0.2 }}
                className="absolute left-0 right-0 mt-2 rounded-2xl glass-panel border border-glass shadow-glass overflow-hidden max-h-60 overflow-y-auto"
              >
                {isSearching ? (
                  <div className="p-4 text-center text-xs text-text-secondary">
                    Searching...
                  </div>
                ) : searchResults.length === 0 ? (
                  <div className="p-4 text-center text-xs text-text-secondary">
                    No cities found.
                  </div>
                ) : (
                  <ul className="py-1">
                    {searchResults.map((result) => (
                      <li key={result.id}>
                        <button
                          onClick={() => handleSelectResult(result)}
                          className="w-full flex items-center text-left px-4 py-2.5 hover:bg-accent/10 border-b border-glass/40 last:border-0 text-sm text-primary transition-colors duration-150"
                        >
                          <MapPin className="h-4 w-4 text-accent mr-2 shrink-0" />
                          <div className="truncate">
                            <span className="font-medium text-primary">
                              {result.name}
                            </span>
                            {result.admin && (
                              <span className="text-xs text-text-secondary/70 ml-1.5">
                                {result.admin}
                              </span>
                            )}
                            <span className="text-xs text-accent font-semibold ml-1.5 uppercase">
                              {result.countryCode}
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

        {/* Customization Actions */}
        <div className="flex items-center gap-1.5 md:gap-3">
          
          {/* Accent Color Trigger */}
          <div className="relative" ref={pickerRef}>
            <button
              onClick={() => setShowAccentPicker(!showAccentPicker)}
              className="p-2 rounded-full border border-glass hover:border-accent/40 bg-secondary/35 text-text-secondary hover:text-accent transition-all duration-300"
              title="Change Accent Color"
            >
              <Palette className="h-4.5 w-4.5" />
            </button>

            <AnimatePresence>
              {showAccentPicker && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9, y: 10 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 mt-2 p-2 rounded-2xl glass-panel border border-glass shadow-glass flex flex-col gap-1 w-40"
                >
                  <p className="text-[10px] uppercase font-bold text-text-secondary tracking-wider text-center py-1 border-b border-glass">
                    Select Accent
                  </p>
                  {accentsList.map((item) => (
                    <button
                      key={item.value}
                      onClick={() => {
                        selectAccent(item.value);
                        setShowAccentPicker(false);
                      }}
                      className={`flex items-center gap-2.5 w-full text-left px-2 py-1.5 rounded-lg text-xs font-semibold text-primary transition-all duration-150 hover:bg-secondary/80 ${
                        accent === item.value ? "bg-accent/10 border border-accent/20" : "border border-transparent"
                      }`}
                    >
                      <span className={`h-3.5 w-3.5 rounded-full ${item.color} border border-white/20 shadow-sm shrink-0`} />
                      {item.name}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Theme Toggle Button */}
          <button
            onClick={toggleTheme}
            className="p-2 rounded-full border border-glass hover:border-accent/40 bg-secondary/35 text-text-secondary hover:text-accent transition-all duration-300"
            title={theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
          >
            {theme === "dark" ? (
              <Sun className="h-4.5 w-4.5" />
            ) : (
              <Moon className="h-4.5 w-4.5" />
            )}
          </button>
        </div>
      </div>
    </header>
  );
}
