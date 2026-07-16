import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q");

    if (!query || query.trim().length < 2) {
      return NextResponse.json({ results: [] });
    }

    const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
      query
    )}&count=5&language=en`;

    const res = await fetch(url, {
      next: { revalidate: 3600 }, // Cache search terms for 1 hour
    });

    if (!res.ok) {
      throw new Error(`Open-Meteo Geocoding API error: ${res.statusText}`);
    }

    const data = await res.json();
    const results = (data.results || []).map((item: any) => ({
      id: item.id,
      name: item.name,
      country: item.country || "",
      countryCode: item.country_code || "",
      admin: item.admin1 || "",
      lat: item.latitude,
      lon: item.longitude,
    }));

    return NextResponse.json({ results });
  } catch (error: any) {
    console.error("Geocoding API Route Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to search locations." },
      { status: 500 }
    );
  }
}
