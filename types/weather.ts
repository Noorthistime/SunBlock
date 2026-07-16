export interface WeatherForecast {
  date: string;
  weatherCode: number;
  tempMax: number;
  tempMin: number;
  uvIndex: number;
  rainProb: number;
  windSpeed: number;
}

export interface WeatherLayerPoint {
  name: string;
  lat: number;
  lon: number;
  temperature: number;
  rain: number;
  windSpeed: number;
  windDirection: number;
  weatherCode: number;
}

export interface WeatherData {
  location: {
    lat: number;
    lon: number;
  };
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
  forecast: WeatherForecast[];
  layers: WeatherLayerPoint[];
}

export interface LocationResult {
  id: number;
  name: string;
  country: string;
  countryCode: string;
  admin: string;
  lat: number;
  lon: number;
}

export type ThemeType = "light" | "dark";
export type AccentType = "red" | "orange" | "green" | "blue";
export type LayerType = "temp" | "rain" | "wind";
export type UnitType = "celsius" | "fahrenheit";
export type SpeedUnitType = "kmh" | "mph";
export type PressureUnitType = "hpa" | "inHg";
export type DistanceUnitType = "km" | "mi";
