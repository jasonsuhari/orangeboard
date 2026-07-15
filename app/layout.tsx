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

const siteUrl =
  (process.env.NEXT_PUBLIC_SITE_URL ?? "https://orangeboard-inky.vercel.app").replace(
    /\/$/,
    "",
  );
const title = "Peel by Orangeboard — AI Out-of-Home Advertising";
const description =
  "Peel by Orangeboard maps billboard inventory, scores physical visibility, finds nearby buyers, and generates targeted out-of-home advertising campaigns.";

export const metadata: Metadata = {
  title: {
    default: title,
    template: "%s | Peel by Orangeboard",
  },
  description,
  applicationName: "Peel by Orangeboard",
  metadataBase: new URL(siteUrl),
  authors: [
    {
      name: "Jason Matthew Suhari",
      url: "https://www.jasonsuhari.com",
    },
  ],
  creator: "Jason Matthew Suhari",
  publisher: "Orangeboard",
  keywords: [
    "out-of-home advertising",
    "OOH advertising",
    "billboard advertising",
    "AI sales automation",
    "account-based marketing",
    "geospatial advertising",
    "billboard visibility analysis",
    "Orangeboard",
    "Peel",
  ],
  alternates: {
    canonical: "/",
  },
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    title,
    description,
    url: "/",
    siteName: "Peel by Orangeboard",
    type: "website",
    images: [
      {
        url: "/peel-placeholder-poster.png",
        alt: "Peel by Orangeboard billboard campaign platform",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
    images: ["/peel-placeholder-poster.png"],
  },
};

const softwareApplicationJsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "Peel by Orangeboard",
  alternateName: "Orangeboard",
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web",
  url: siteUrl,
  description,
  creator: {
    "@type": "Person",
    name: "Jason Matthew Suhari",
    url: "https://www.jasonsuhari.com",
  },
  featureList: [
    "Billboard inventory mapping",
    "Physical visibility analysis",
    "Geospatial buyer discovery",
    "AI campaign creative generation",
    "Out-of-home sales automation",
  ],
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
      <body>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(softwareApplicationJsonLd).replace(/</g, "\\u003c"),
          }}
        />
        {children}
      </body>
    </html>
  );
}
