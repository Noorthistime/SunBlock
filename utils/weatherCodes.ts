import {
  Sun,
  CloudSun,
  Cloud,
  CloudFog,
  CloudDrizzle,
  CloudRain,
  CloudSnow,
  CloudRainWind,
  CloudLightning,
  LucideIcon,
} from "lucide-react";

interface WeatherCodeDetails {
  label: string;
  icon: LucideIcon;
}

export function getWeatherDetails(code: number): WeatherCodeDetails {
  // Map WMO weather codes (https://open-meteo.com/en/docs)
  switch (code) {
    case 0:
      return { label: "Clear Sky", icon: Sun };
    case 1:
      return { label: "Mainly Clear", icon: CloudSun };
    case 2:
      return { label: "Partly Cloudy", icon: CloudSun };
    case 3:
      return { label: "Overcast", icon: Cloud };
    case 45:
    case 48:
      return { label: "Foggy", icon: CloudFog };
    case 51:
    case 53:
    case 55:
      return { label: "Drizzle", icon: CloudDrizzle };
    case 56:
    case 57:
      return { label: "Freezing Drizzle", icon: CloudDrizzle };
    case 61:
      return { label: "Light Rain", icon: CloudRain };
    case 63:
      return { label: "Moderate Rain", icon: CloudRain };
    case 65:
      return { label: "Heavy Rain", icon: CloudRain };
    case 66:
    case 67:
      return { label: "Freezing Rain", icon: CloudRain };
    case 71:
      return { label: "Light Snow", icon: CloudSnow };
    case 73:
      return { label: "Moderate Snow", icon: CloudSnow };
    case 75:
      return { label: "Heavy Snow", icon: CloudSnow };
    case 77:
      return { label: "Snow Grains", icon: CloudSnow };
    case 80:
    case 81:
    case 82:
      return { label: "Rain Showers", icon: CloudRainWind };
    case 85:
    case 86:
      return { label: "Snow Showers", icon: CloudSnow };
    case 95:
      return { label: "Thunderstorm", icon: CloudLightning };
    case 96:
    case 99:
      return { label: "Thunderstorm with Hail", icon: CloudLightning };
    default:
      return { label: "Unknown Conditions", icon: Cloud };
  }
}
