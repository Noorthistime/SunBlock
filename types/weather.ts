/**
 * Represents a single daily weather forecast item returned from the weather API.
 */
export interface WeatherForecast {
  /** ISO date string (YYYY-MM-DD) */
  date: string;
  /** WMO weather interpretation code */
  weatherCode: number;
  /** Maximum daily temperature in degrees Celsius */
  tempMax: number;
  /** Minimum daily temperature in degrees Celsius */
  tempMin: number;
  /** Maximum daily Ultraviolet Index */
  uvIndex: number;
  /** Precipitation probability percentage (0–100%) */
  rainProb: number;
  /** Maximum daily wind speed in km/h */
  windSpeed: number;
}

/**
 * Represents a spatial point dataset for interactive GIS map visualization.
 */
export interface WeatherLayerPoint {
  /** Location name or regional indicator */
  name: string;
  /** Geographical latitude coordinate in decimal degrees */
  lat: number;
  /** Geographical longitude coordinate in decimal degrees */
  lon: number;
  /** Current ambient temperature in degrees Celsius */
  temperature: number;
  /** Accumulated rainfall in millimeters */
  rain: number;
  /** Wind velocity in kilometers per hour */
  windSpeed: number;
  /** Wind direction in degrees (0–360°) */
  windDirection: number;
  /** WMO weather interpretation code */
  weatherCode: number;
}

/**
 * Complete normalized weather data state structure.
 */
export interface WeatherData {
  /** Coordinates of the active weather location */
  location: {
    lat: number;
    lon: number;
  };
  /** Current atmospheric conditions */
  current: {
    temp: number;
    feelsLike: number;
    humidity: number;
    pressure: number;
    windSpeed: number;
    windDirection: number;
    uvIndex: number;
    weatherCode: number;
    sunrise: string;
    sunset: string;
  };
  /** 7-day daily weather forecast list */
  forecast: WeatherForecast[];
  /** Regional grid spatial data points for map overlay layers */
  layers: WeatherLayerPoint[];
}

/**
 * Geocoding location search result.
 */
export interface LocationResult {
  /** Unique location identifier */
  id: number;
  /** City or location name */
  name: string;
  /** Country name */
  country: string;
  /** 2-letter ISO country code */
  countryCode: string;
  /** Administrative division/region name */
  admin: string;
  /** Latitude coordinate */
  lat: number;
  /** Longitude coordinate */
  lon: number;
}

/** Interface theme mode */
export type ThemeType = "light" | "dark";
/** UI accent color theme */
export type AccentType = "red" | "orange" | "green" | "blue";
/** Active primary map layer display */
export type LayerType = "temp" | "rain" | "wind";
/** Temperature unit preference */
export type UnitType = "celsius" | "fahrenheit";
/** Wind speed unit preference */
export type SpeedUnitType = "kmh" | "mph";
/** Atmospheric pressure unit preference */
export type PressureUnitType = "hpa" | "inHg";
/** Distance measurement unit preference */
export type DistanceUnitType = "km" | "mi";
