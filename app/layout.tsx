import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Orangeboard - Passive outbound for physical ABM",
  description:
    "Orangeboard helps B2B teams discover physical-world ICP opportunities, generate local creative, and coordinate outbound around real-world touchpoints.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
