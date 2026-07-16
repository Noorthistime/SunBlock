import type { Metadata, Viewport } from "next";
import { Inter, Barlow_Condensed } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const barlowCondensed = Barlow_Condensed({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  variable: "--font-condensed",
  display: "swap",
});

export const metadata: Metadata = {
  title: "SunBlock — Monochrome Weather Dashboard",
  description: "A premium monochromatic weather dashboard supporting Frosted Paper (clinical blueprint) and Gallery Grid (Brutalist Mono X7) design modes.",
  keywords: ["SunBlock", "Weather Dashboard", "Next.js", "Tailwind CSS v4", "Leaflet", "OpenStreetMap", "Minimalist", "Monochromatic"],
  authors: [{ name: "SunBlock Team" }],
  manifest: "/manifest.json",
  icons: {
    icon: "/favicon.ico",
    apple: "/apple-icon.png",
  },
  openGraph: {
    title: "SunBlock — Monochrome Weather Dashboard",
    description: "Achromatic multi-day forecasts and weather layers overlaying an interactive map interface.",
    url: "https://sunblock.vercel.app",
    siteName: "SunBlock",
    images: [
      {
        url: "https://images.unsplash.com/photo-1592210454359-9043f067919b?w=1200&auto=format&fit=crop&q=80",
        width: 1200,
        height: 630,
        alt: "SunBlock Weather Dashboard Preview",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "SunBlock — Monochrome Weather & Map Dashboard",
    description: "Beautiful monochromatic multi-day forecasts and Leaflet interactive map overlays.",
    images: ["https://images.unsplash.com/photo-1592210454359-9043f067919b?w=1200&auto=format&fit=crop&q=80"],
  },
};

export const viewport: Viewport = {
  themeColor: "#ffffff",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${barlowCondensed.variable}`} data-style="frosted">
      <body className="dot-grid-bg antialiased">
        {children}
      </body>
    </html>
  );
}
