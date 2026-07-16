import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const latStr = searchParams.get("lat");
    const lonStr = searchParams.get("lon");

    if (!latStr || !lonStr) {
      return NextResponse.json(
        { error: "Latitude and longitude parameters are required." },
        { status: 400 }
      );
    }

    const lat = parseFloat(latStr);
    const lon = parseFloat(lonStr);

    if (isNaN(lat) || isNaN(lon)) {
      return NextResponse.json(
        { error: "Invalid latitude or longitude." },
        { status: 400 }
      );
    }

    // Generate surrounding grid points for weather layers (8 directions + primary)
    // Offset is scaled a bit dynamically or kept static around ~0.6 to 1.2 degrees for regional coverage
    const coordinates = [
      { name: "Primary", lat, lon },
      { name: "North", lat: lat + 0.7, lon },
      { name: "South", lat: lat - 0.7, lon },
      { name: "East", lat, lon: lon + 1.0 },
      { name: "West", lat, lon: lon - 1.0 },
      { name: "NorthEast", lat: lat + 0.5, lon: lon + 0.7 },
      { name: "NorthWest", lat: lat + 0.5, lon: lon - 0.7 },
      { name: "SouthEast", lat: lat - 0.5, lon: lon + 0.7 },
      { name: "SouthWest", lat: lat - 0.5, lon: lon - 0.7 },
    ];

    const lats = coordinates.map((c) => c.lat).join(",");
    const lons = coordinates.map((c) => c.lon).join(",");

    // Single batched request to Open-Meteo
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lats}&longitude=${lons}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,rain,weather_code,pressure_msl,wind_speed_10m,wind_direction_10m,uv_index&daily=weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset,uv_index_max,precipitation_probability_max,wind_speed_10m_max&timezone=auto`;

    const res = await fetch(url, {
      next: { revalidate: 900 }, // Cache response for 15 minutes
    });

    if (!res.ok) {
      throw new Error(`Open-Meteo API error: ${res.statusText}`);
    }

    const data = await res.json();

    // Since it's a batched query, Open-Meteo returns an array or single object if only one coord is sent.
    // If multiple coords are sent, it returns an array of weather responses.
    const weatherList = Array.isArray(data) ? data : [data];

    // Primary weather data is the first index
    const primaryWeather = weatherList[0];
    if (!primaryWeather || !primaryWeather.current) {
      throw new Error("Invalid weather data returned from server.");
    }

    // Extract forecast data for 5 days
    const daily = primaryWeather.daily;
    const forecast = daily.time.map((time: string, idx: number) => ({
      date: time,
      weatherCode: daily.weather_code[idx],
      tempMax: daily.temperature_2m_max[idx],
      tempMin: daily.temperature_2m_min[idx],
      uvIndex: daily.uv_index_max[idx],
      rainProb: daily.precipitation_probability_max[idx],
      windSpeed: daily.wind_speed_10m_max[idx],
    }));

    // Map layers for the 9 points (including primary)
    const layers = weatherList.map((weather: any, idx: number) => {
      const coord = coordinates[idx];
      return {
        name: coord.name,
        lat: coord.lat,
        lon: coord.lon,
        temperature: weather.current.temperature_2m,
        rain: weather.current.rain,
        windSpeed: weather.current.wind_speed_10m,
        windDirection: weather.current.wind_direction_10m,
        weatherCode: weather.current.weather_code,
      };
    });

    return NextResponse.json({
      location: {
        lat,
        lon,
      },
      current: {
        temp: primaryWeather.current.temperature_2m,
        feelsLike: primaryWeather.current.apparent_temperature,
        humidity: primaryWeather.current.relative_humidity_2m,
        pressure: primaryWeather.current.pressure_msl,
        windSpeed: primaryWeather.current.wind_speed_10m,
        windDirection: primaryWeather.current.wind_direction_10m,
        uvIndex: primaryWeather.current.uv_index,
        weatherCode: primaryWeather.current.weather_code,
        sunrise: daily.sunrise[0]?.split("T")[1] || "06:00",
        sunset: daily.sunset[0]?.split("T")[1] || "18:00",
      },
      forecast,
      layers,
    });
  } catch (error: any) {
    console.error("Weather API Route Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch weather data." },
      { status: 500 }
    );
  }
}
