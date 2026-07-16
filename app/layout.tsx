import type { Metadata, Viewport } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-serif",
  display: "swap",
});

export const metadata: Metadata = {
  title: "SunBlock — Premium Weather Dashboard",
  description: "A gorgeous, accent-swappable weather dashboard with high-fidelity animations, floating glass capsule panels, and a Leaflet weather map.",
  keywords: ["SunBlock", "Weather Dashboard", "Next.js", "Tailwind CSS v4", "Leaflet", "OpenStreetMap", "Nothing Design", "Glassmorphism"],
  authors: [{ name: "SunBlock Team" }],
  manifest: "/manifest.json",
  icons: {
    icon: "/favicon.ico",
    apple: "/apple-icon.png",
  },
  openGraph: {
    title: "SunBlock — Premium Weather Dashboard",
    description: "Multi-day forecasts and weather layers overlaying an interactive map interface.",
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
    title: "SunBlock — Premium Weather & Map Dashboard",
    description: "Beautiful multi-day forecasts and Leaflet interactive map overlays.",
    images: ["https://images.unsplash.com/photo-1592210454359-9043f067919b?w=1200&auto=format&fit=crop&q=80"],
  },
};

export const viewport: Viewport = {
  themeColor: "#000000",
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
    <html lang="en" className={`${inter.variable} ${playfair.variable}`} data-theme="dark" data-accent="red">
      <body className="dot-grid antialiased">
        <div className="aura-container">
          <div className="aura-bg" />
          <div className="aura-bg-2" />
        </div>
        {children}
      </body>
    </html>
  );
}
