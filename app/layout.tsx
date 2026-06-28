import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "VitaminSee — The performance-marketing stack for the physical world",
  description:
    "VitaminSee turns out-of-home advertising into a measurable, testable, viral performance channel — with targeting, testing, and closed-loop attribution. Your daily dose of attention.",
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
