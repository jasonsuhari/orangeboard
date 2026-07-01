import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Peel - Physical ad campaigns for B2B teams",
  description:
    "Peel helps B2B teams discover physical-world ICP opportunities, book local ad inventory, generate creative, and coordinate outbound around real-world touchpoints.",
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
