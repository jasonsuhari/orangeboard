import type { Metadata, Viewport } from "next";
import { Inter, Instrument_Serif } from "next/font/google";
import "./globals.css";

/* Editorial pairing: a crisp neutral grotesque for the interface, a light
   italic serif for the one emphasized phrase in the headline. */
const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

const instrumentSerif = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  display: "swap",
  variable: "--font-instrument",
});

const title = "Peel — Reach buyers where screens can't";
const description =
  "Peel finds where your accounts cluster in the real world, books the boards that reach them, and turns physical presence into pipeline.";

export const metadata: Metadata = {
  title,
  description,
  applicationName: "Peel",
  metadataBase: new URL("https://peel.to"),
  openGraph: {
    title,
    description,
    siteName: "Peel",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
  },
};

export const viewport: Viewport = {
  themeColor: "#ef4c00",
  colorScheme: "dark",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} ${instrumentSerif.variable}`}>
      <body>{children}</body>
    </html>
  );
}
