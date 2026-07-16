"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  WeatherData,
  LocationResult,
  ThemeType,
  AccentType,
  LayerType,
} from "../types/weather";

export function useWeather() {
  // Default coordinates: London, UK
  const [currentLocation, setCurrentLocation] = useState<{
    name: string;
    lat: number;
    lon: number;
  }>({
    name: "London, United Kingdom",
    lat: 51.5074,
    lon: -0.1278,
  });

  const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Search States
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<LocationResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Layout Themes & Customizations
  const [theme, setTheme] = useState<ThemeType>("dark");
  const [accent, setAccent] = useState<AccentType>("red");
  const [activeLayer, setActiveLayer] = useState<LayerType>("temp");

  // Offline detection
  const [isOffline, setIsOffline] = useState(false);

  // Sync Offline state
  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    setIsOffline(!window.navigator.onLine);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Sync and load theme/accent from localStorage
  useEffect(() => {
    if (typeof window === "undefined") return;

    const savedTheme = localStorage.getItem("sunblock-theme") as ThemeType;
    const savedAccent = localStorage.getItem("sunblock-accent") as AccentType;

    if (savedTheme) {
      setTheme(savedTheme);
      document.documentElement.setAttribute("data-theme", savedTheme);
    } else {
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      const initialTheme = prefersDark ? "dark" : "light";
      setTheme(initialTheme);
      document.documentElement.setAttribute("data-theme", initialTheme);
    }

    if (savedAccent) {
      setAccent(savedAccent);
      document.documentElement.setAttribute("data-accent", savedAccent);
    }
  }, []);

  // Toggle Theme helper
  const toggleTheme = useCallback(() => {
    setTheme((prev) => {
      const nextTheme = prev === "dark" ? "light" : "dark";
      localStorage.setItem("sunblock-theme", nextTheme);
      document.documentElement.setAttribute("data-theme", nextTheme);
      return nextTheme;
    });
  }, []);

  // Set Accent helper
  const selectAccent = useCallback((newAccent: AccentType) => {
    setAccent(newAccent);
    localStorage.setItem("sunblock-accent", newAccent);
    document.documentElement.setAttribute("data-accent", newAccent);
  }, []);

  // Main Weather Fetcher
  const fetchWeather = useCallback(async (lat: number, lon: number) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/weather?lat=${lat}&lon=${lon}`);
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to fetch weather data.");
      }
      const data: WeatherData = await res.json();
      setWeatherData(data);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch weather automatically when location changes
  useEffect(() => {
    fetchWeather(currentLocation.lat, currentLocation.lon);
  }, [currentLocation.lat, currentLocation.lon, fetchWeather]);

  // Debounced geocoding search
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (searchQuery.trim().length < 2) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(searchQuery)}`);
        if (res.ok) {
          const data = await res.json();
          setSearchResults(data.results || []);
        }
      } catch (err) {
        console.error("Geocoding search failed", err);
      } finally {
        setIsSearching(false);
      }
    }, 450); // 450ms debounce time

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchQuery]);

  // Geolocation trigger
  const getUserLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser.");
      return;
    }

    setIsLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        try {
          // Attempt to reverse geocode coordinate to get a nice name (via Open-Meteo or generic fallback)
          const reverseRes = await fetch(
            `https://geocoding-api.open-meteo.com/v1/search?name=${latitude},${longitude}&count=1`
          );
          let name = `Location (${latitude.toFixed(2)}, ${longitude.toFixed(2)})`;
          if (reverseRes.ok) {
            const data = await reverseRes.json();
            if (data.results && data.results[0]) {
              const matched = data.results[0];
              name = `${matched.name}, ${matched.country || ""}`;
            }
          }
          setCurrentLocation({ name, lat: latitude, lon: longitude });
        } catch {
          setCurrentLocation({
            name: `My Position (${latitude.toFixed(2)}, ${longitude.toFixed(2)})`,
            lat: latitude,
            lon: longitude,
          });
        }
      },
      (geoError) => {
        console.error("Geolocation request failed:", geoError);
        setError("Unable to retrieve your location. Check browser settings.");
        setIsLoading(false);
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
    );
  }, []);

  return {
    currentLocation,
    setCurrentLocation,
    weatherData,
    isLoading,
    error,
    fetchWeather,
    searchQuery,
    setSearchQuery,
    searchResults,
    setSearchResults,
    isSearching,
    theme,
    toggleTheme,
    accent,
    selectAccent,
    activeLayer,
    setActiveLayer,
    isOffline,
    getUserLocation,
  };
}
export type UseWeatherReturn = ReturnType<typeof useWeather>;
